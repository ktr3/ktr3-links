import { sendWithResend } from "./resend.js";

export async function sendEmail(message) {
  const driver = process.env.EMAIL_DRIVER
    || (process.env.RESEND_API_KEY ? "resend" : "development");

  if (driver === "resend") return sendWithResend(message);
  if (driver !== "development") throw new Error(`Unsupported email driver: ${driver}`);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development email driver is disabled in production");
  }

  return {
    provider: "development",
    preview: {
      to: message.to,
      subject: message.subject,
    },
  };
}
