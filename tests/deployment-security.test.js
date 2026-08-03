import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import nextConfig, { createContentSecurityPolicy } from "../next.config.mjs";
import { publicLegalIdentity } from "../lib/legal/public-identity.js";

test("every route receives the production security headers", async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  const [{ source, headers }] = await nextConfig.headers();
  const byName = Object.fromEntries(headers.map(({ key, value }) => [key, value]));

  assert.equal(source, "/:path*");
  assert.equal(byName["X-Content-Type-Options"], "nosniff");
  assert.equal(byName["X-Frame-Options"], "DENY");
  assert.match(byName["Strict-Transport-Security"], /max-age=31536000/);
  assert.match(byName["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(byName["Content-Security-Policy"], /https:\/\/challenges\.cloudflare\.com/);
  assert.match(byName["Content-Security-Policy"], /https:\/\/eu\.i\.posthog\.com/);
  assert.doesNotMatch(createContentSecurityPolicy({ development: false }), /unsafe-eval/);
  assert.match(createContentSecurityPolicy({ development: true }), /unsafe-eval/);
});

test("legal identity is complete only when every public field is configured", () => {
  const incomplete = publicLegalIdentity({ PUBLIC_LEGAL_EMAIL: "prod.ktr3@gmail.com" });
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.email, "prod.ktr3@gmail.com");

  const complete = publicLegalIdentity({
    PUBLIC_LEGAL_NAME: "KTR3 Example",
    PUBLIC_LEGAL_TAX_ID: "PUBLIC-ID",
    PUBLIC_LEGAL_ADDRESS: "Public business address",
    PUBLIC_LEGAL_EMAIL: "legal@example.com",
  });
  assert.equal(complete.complete, true);
  assert.equal(complete.name, "KTR3 Example");
});

test("production compose fails closed on missing legal identity and persists resources", async () => {
  const compose = await readFile(new URL("../docker-compose.prod.yml", import.meta.url), "utf8");
  assert.match(compose, /PUBLIC_LEGAL_NAME: \$\{PUBLIC_LEGAL_NAME:\?PUBLIC_LEGAL_NAME is required\}/);
  assert.match(compose, /PUBLIC_LEGAL_TAX_ID: \$\{PUBLIC_LEGAL_TAX_ID:\?PUBLIC_LEGAL_TAX_ID is required\}/);
  assert.match(compose, /APP_ORIGIN: \$\{APP_ORIGIN:-https:\/\/ktr3\.es,https:\/\/www\.ktr3\.es\}/);
  assert.match(compose, /resources_data:\/data\/resources/);
});

test("production image includes the database client required by maintenance scripts", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
  assert.match(
    dockerfile,
    /COPY --from=dependencies --chown=nextjs:nodejs \/app\/node_modules\/postgres \.\/node_modules\/postgres/,
  );
});

test("backup uses restrictive permissions, a validated custom dump and the production volume", async () => {
  const script = await readFile(new URL("../scripts/backup-resources.sh", import.meta.url), "utf8");
  assert.match(script, /umask 077/);
  assert.match(script, /pg_dump -Fc/);
  assert.match(script, /pg_restore --list/);
  assert.match(script, /COMPOSE_PROJECT_NAME:-ktr3production/);
  assert.match(script, /--user "\$\{backup_uid\}:\$\{backup_gid\}"/);
  assert.match(script, /sh -eu -c 'umask 077; tar/);
});
