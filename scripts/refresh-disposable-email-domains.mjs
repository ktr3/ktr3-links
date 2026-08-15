import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";
const outputPath = fileURLToPath(new URL("../lib/security/disposable-email-domains.txt", import.meta.url));

const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(20000) });
if (!response.ok) {
  throw new Error(`Unable to refresh disposable email domains (${response.status})`);
}

const domains = [...new Set(
  (await response.text())
    .split(/\r?\n/)
    .map((domain) => domain.trim().toLocaleLowerCase("en"))
    .filter(Boolean),
)].sort();

if (domains.length < 1000 || domains.some((domain) => !/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(domain))) {
  throw new Error("Disposable email domain source failed validation");
}

const header = [
  "# Source: disposable-email-domains/disposable-email-domains",
  "# License: CC0-1.0 / public domain",
  "# Refresh with: npm run security:refresh-disposable-emails",
  "",
].join("\n");
await writeFile(outputPath, `${header}${domains.join("\n")}\n`, "utf8");
process.stdout.write(`Updated ${domains.length} disposable email domains from ${SOURCE_URL}\n`);
