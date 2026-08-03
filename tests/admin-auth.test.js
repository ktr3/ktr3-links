import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword,
  verifyPassword,
} from "../lib/auth/password.js";
import {
  createOpaqueToken,
  digestToken,
  sessionCookieOptions,
} from "../lib/auth/session.js";
import {
  isTrustedMutationOrigin,
  mutationOriginDiagnostic,
} from "../lib/auth/request.js";

test("password hashes round-trip without storing plaintext", async () => {
  const password = "correct horse battery staple";
  const hash = await hashPassword(password);

  assert.equal(hash.includes(password), false);
  assert.match(hash, /^scrypt-v1\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("malformed password hashes fail closed", async () => {
  assert.equal(await verifyPassword("anything", "broken"), false);
  assert.equal(await verifyPassword("anything", "scrypt-v1$bad$bad"), false);
});

test("opaque session tokens are random and stored as fixed digests", () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();

  assert.notEqual(first, second);
  assert.equal(digestToken(first).length, 64);
  assert.match(digestToken(first), /^[a-f0-9]{64}$/);
});

test("session cookies are protected in production", () => {
  const options = sessionCookieOptions({ production: true });
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
});

test("mutation origin accepts same-origin requests and rejects cross-site requests", () => {
  assert.equal(isTrustedMutationOrigin({
    requestUrl: "https://ktr3.es/api/admin/resources",
    origin: "https://ktr3.es",
  }), true);
  assert.equal(isTrustedMutationOrigin({
    requestUrl: "https://ktr3.es/api/admin/resources",
    origin: "https://evil.example",
  }), false);
  assert.equal(isTrustedMutationOrigin({
    requestUrl: "http://localhost:3000/api/admin/login",
    origin: "http://localhost:3000",
  }), true);
});

test("configured public origin survives an internal Next.js container URL", () => {
  assert.equal(isTrustedMutationOrigin({
    requestUrl: "http://0.0.0.0:3000/api/resources/lucid/request",
    origin: "https://ktr3.es",
    trustedOrigin: "https://ktr3.es",
  }), true);
  assert.equal(isTrustedMutationOrigin({
    requestUrl: "http://0.0.0.0:3000/api/resources/lucid/request",
    origin: "https://evil.example",
    trustedOrigin: "https://ktr3.es",
  }), false);
});

test("configured public origin allowlist accepts apex and www only", () => {
  const trustedOrigin = "https://ktr3.es,https://www.ktr3.es";
  for (const origin of ["https://ktr3.es", "https://www.ktr3.es"]) {
    assert.equal(isTrustedMutationOrigin({
      requestUrl: "https://0.0.0.0:3000/api/resources/lucid/request",
      origin,
      trustedOrigin,
    }), true);
  }
  assert.equal(isTrustedMutationOrigin({
    requestUrl: "https://0.0.0.0:3000/api/resources/lucid/request",
    origin: "https://ktr3.es.evil.example",
    trustedOrigin,
  }), false);
});

test("mutation origin diagnostics contain origins only and omit paths or request data", () => {
  const request = new Request("http://internal:3000/api/resources/private?token=secret", {
    headers: {
      origin: "https://ktr3.es/private/path",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "ktr3.es",
    },
  });
  assert.deepEqual(mutationOriginDiagnostic(request), {
    requestOrigin: "http://internal:3000",
    suppliedOrigin: "https://ktr3.es",
    configuredOrigins: [],
    forwardedOrigin: "https://ktr3.es",
  });
});
