export function isTrustedMutationOrigin({ requestUrl, origin, trustedOrigin }) {
  try {
    if (!origin) return false;
    return new URL(trustedOrigin || requestUrl).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

function parsedOrigin(value) {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

function firstForwardedValue(value) {
  return String(value || "").split(",")[0].trim();
}

export function mutationOriginDiagnostic(request) {
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  return {
    requestOrigin: parsedOrigin(request.url),
    suppliedOrigin: parsedOrigin(request.headers.get("origin")),
    configuredOrigin: parsedOrigin(process.env.APP_ORIGIN),
    forwardedOrigin: parsedOrigin(
      forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : null,
    ),
  };
}

export function assertTrustedMutation(request) {
  if (!isTrustedMutationOrigin({
    requestUrl: request.url,
    origin: request.headers.get("origin"),
    trustedOrigin: process.env.APP_ORIGIN,
  })) {
    console.warn("Rejected mutation origin", mutationOriginDiagnostic(request));
    throw new Error("Untrusted mutation origin");
  }
}
