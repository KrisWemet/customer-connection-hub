import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return Twilio(accountSid, authToken);
}

export async function sendSMS(to: string, body: string) {
  const client = getTwilioClient();
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER not configured");
  const msg = await client.messages.create({
    to,
    from: fromNumber,
    body,
  });
  return { sid: msg.sid, status: msg.status };
}

// Minimal inbound handler signature placeholder
export function parseInboundSMS(payload: any) {
  // Twilio webhook fields of interest
  return {
    from: payload?.From,
    to: payload?.To,
    body: payload?.Body,
    messageSid: payload?.MessageSid,
  };
}
