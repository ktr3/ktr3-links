export async function verifyTurnstile({ token, remoteIp }) {
  const enforced = process.env.TURNSTILE_ENFORCE === "true"
    || process.env.NODE_ENV === "production";
  if (!enforced) return true;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}
