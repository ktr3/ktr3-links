export function isTrustedMutationOrigin({ requestUrl, origin }) {
  try {
    if (!origin) return false;
    return new URL(requestUrl).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

export function assertTrustedMutation(request) {
  if (!isTrustedMutationOrigin({
    requestUrl: request.url,
    origin: request.headers.get("origin"),
  })) {
    throw new Error("Untrusted mutation origin");
  }
}
