import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

function getResendClient() {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(resendApiKey);
}

export async function sendEmail(to: string, subject: string, body: string) {
  const client = getResendClient();
  const resp = await client.emails.send({
    from: "Rustic Retreat <noreply@rusticretreat.test>",
    to,
    subject,
    html: body,
  });
  return { id: resp.data?.id ?? resp.error?.message ?? "unknown" };
}
