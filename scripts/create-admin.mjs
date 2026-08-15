import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { hashPassword } from "../lib/auth/password.js";

const [emailArgument, ...nameParts] = process.argv.slice(2);
const email = String(emailArgument || "").trim().toLocaleLowerCase("en");
const displayName = nameParts.join(" ").trim() || "Ktr3";

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error(
      "Interactive password entry requires a TTY. For trusted automation, inject ADMIN_PASSWORD through the secret manager.",
    );
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (character) => {
      if (character === "\u0003") {
        finish(new Error("Password entry cancelled"));
        return;
      }
      if (character === "\r" || character === "\n") {
        finish();
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (character >= " ") value += character;
    };

    process.stdin.on("data", onData);
  });
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Usage: npm run admin:create -- email@example.com "Display Name"');
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await readHidden("New admin password: ");
  const confirmation = await readHidden("Confirm password: ");
  if (password !== confirmation) {
    throw new Error("Passwords do not match");
  }
}

const sql = getDatabase();
try {
  const passwordHash = await hashPassword(password);
  const [admin] = await sql`
    insert into admin_users (email, password_hash, display_name)
    values (${email}, ${passwordHash}, ${displayName})
    on conflict (email) do update
    set password_hash = excluded.password_hash,
        display_name = excluded.display_name,
        is_active = true,
        updated_at = now()
    returning id, email, display_name
  `;
  await sql`delete from admin_sessions where admin_user_id = ${admin.id}`;
  process.stdout.write(`Admin ready: ${admin.email} (${admin.displayName})\n`);
} finally {
  password = undefined;
  await closeDatabase();
}
