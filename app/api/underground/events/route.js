import { assertTrustedMutation } from "../../../../lib/auth/request.js";
import { recordUndergroundEvent } from "../../../../lib/underground/analytics-repository.js";

export const dynamic = "force-dynamic";

async function boundedJson(request, maximumBytes = 4096) {
  const declaredLength = Number(request.headers.get("content-length")) || 0;
  if (declaredLength > maximumBytes) throw new Error("Analytics payload too large");
  if (!request.body) throw new Error("Invalid analytics JSON");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maximumBytes) {
      await reader.cancel();
      throw new Error("Analytics payload too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid analytics JSON");
  }
}

export async function POST(request) {
  try {
    assertTrustedMutation(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "json_required" }, { status: 415 });
    }
    const result = await recordUndergroundEvent(await boundedJson(request));
    if (!result.accepted) {
      const status = result.reason?.endsWith("rate_limited") ? 429 : 404;
      return Response.json({ error: result.reason }, { status, headers: { "Cache-Control": "no-store" } });
    }
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const tooLarge = /payload too large/i.test(error.message);
    const clientError = /Invalid Underground analytics event|origin|JSON/i.test(error.message);
    if (!clientError && !tooLarge) console.error("Unable to record Underground analytics", error);
    return Response.json(
      { error: tooLarge ? "payload_too_large" : clientError ? "invalid_event" : "analytics_unavailable" },
      { status: tooLarge ? 413 : clientError ? 400 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
