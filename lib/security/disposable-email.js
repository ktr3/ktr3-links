import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { safeSubscriberEmail } from "../resources/grants.js";

const blocklistPath = fileURLToPath(new URL("./disposable-email-domains.txt", import.meta.url));
const disposableDomains = new Set(
  readFileSync(blocklistPath, "utf8")
    .split(/\r?\n/)
    .map((domain) => domain.trim().toLocaleLowerCase("en"))
    .filter((domain) => domain && !domain.startsWith("#")),
);

export class DisposableEmailError extends Error {
  constructor() {
    super("Usa un email permanente; no se admiten correos temporales.");
    this.name = "DisposableEmailError";
    this.status = 400;
  }
}

export function emailDomainCandidates(value) {
  const email = safeSubscriberEmail(value);
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const parts = domain.split(".");
  const candidates = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    candidates.push(parts.slice(index).join("."));
  }
  return candidates;
}

export function isDisposableEmail(value) {
  return emailDomainCandidates(value).some((domain) => disposableDomains.has(domain));
}

export function assertPermanentSubscriberEmail(value) {
  const email = safeSubscriberEmail(value);
  if (isDisposableEmail(email)) throw new DisposableEmailError();
  return email;
}
