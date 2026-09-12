import { env } from "../config/env";

/**
 * The ONLY place that talks to a WhatsApp provider. Mirrors email.service.ts:
 * until WHATSAPP_PROVIDER + that provider's credentials are set in .env,
 * sending is a deliberate no-op — it logs the message server-side and
 * reports `sent: false` rather than pretending delivery happened. Callers
 * must never surface a class reminder as "sent via WhatsApp" unless this
 * actually returns `sent: true`.
 */

export interface ClassReminderMessage {
  facultyName: string;
  /** Preferred salutation from the faculty's profile ("Mr.", "Ms.", "Dr.", "Prof.") — never assumed if unset. */
  facultyTitle?: string | null;
  phone: string;
  subjectName: string;
  roomNumber: string;
  blockName: string;
  section: string;
  /** Class start time, 24h "HH:mm" — used both for the greeting and the displayed time. */
  startTime: string;
}

function getGreeting(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatTime12h(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

// A stored title is used verbatim; with none on file, we address the faculty
// by name alone rather than guessing "Mr."/"Ms." for someone whose gender
// isn't tracked anywhere in the system.
function addressee(facultyTitle: string | null | undefined, facultyName: string): string {
  const title = facultyTitle?.trim();
  return title ? `${title} ${facultyName}` : facultyName;
}

/** The exact wording a WhatsApp Business template would need to be approved for. */
export function buildClassReminderText({
  facultyName,
  facultyTitle,
  subjectName,
  roomNumber,
  blockName,
  section,
  startTime,
}: ClassReminderMessage): string {
  const name = addressee(facultyTitle, facultyName);

  return (
    `${getGreeting(startTime)}, ${name}. 🙏\n\n` +
    `This is a gentle reminder that your next class is scheduled to begin in 5 minutes.\n\n` +
    `📚 Subject: ${subjectName}\n` +
    `🏫 Room No: ${roomNumber}\n` +
    `🏢 Block: ${blockName}\n` +
    `👥 Section: ${section}\n` +
    `🕐 Time: ${formatTime12h(startTime)}\n\n` +
    `Kindly proceed to the classroom and attend the class on time.\n\n` +
    `Thank you, ${name}. 🙏\n\n` +
    `M.I.C. College Digital Campus`
  );
}

/**
 * Normalizes a stored phone number to E.164 (e.g. "9876543210" -> "+919876543210").
 * Returns null if the number doesn't look like a plausible mobile number —
 * callers should skip sending (and log why) rather than call a provider with
 * a malformed destination.
 */
export function toE164(phone: string, defaultCountryCode = env.whatsapp.defaultCountryCode): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return /^\+\d{8,15}$/.test(digits) ? digits : null;
  if (/^\d{10}$/.test(digits)) return `+${defaultCountryCode}${digits}`;
  if (/^\d{11,15}$/.test(digits)) return `+${digits}`;
  return null;
}

export async function sendClassReminderWhatsApp(message: ClassReminderMessage): Promise<{ sent: boolean }> {
  const text = buildClassReminderText(message);
  const to = toE164(message.phone);

  if (!to) {
    // eslint-disable-next-line no-console
    console.log(`[whatsapp] NOT SENT — "${message.phone}" is not a usable phone number for ${message.facultyName}.`);
    return { sent: false };
  }

  if (!env.whatsappConfigured) {
    // eslint-disable-next-line no-console
    console.log(`[whatsapp] NOT SENT — no WhatsApp provider configured. Message for ${message.facultyName} (${to}):\n${text}`);
    return { sent: false };
  }

  if (env.whatsapp.provider === "twilio") {
    return sendViaTwilio(to, text);
  }
  if (env.whatsapp.provider === "meta") {
    return sendViaMeta(to, text);
  }

  return { sent: false };
}

// NOTE: WhatsApp only allows free-form text like this within a 24-hour window
// after the recipient has messaged the business first. A proactive reminder
// like this one is "business-initiated" and, in production, must use a
// pre-approved Message Template instead (Twilio Content API / Meta template
// messages) — submit the wording in buildClassReminderText() for approval
// with your provider, then swap the calls below to their template-send API
// once you know the approved template's name and variable order.

async function sendViaTwilio(to: string, body: string): Promise<{ sent: boolean }> {
  const { accountSid, authToken, fromNumber } = env.whatsapp.twilio;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: `whatsapp:${to}`,
      Body: body,
    }),
  });

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`[whatsapp] Twilio send failed (${res.status}): ${await res.text()}`);
    return { sent: false };
  }

  return { sent: true };
}

async function sendViaMeta(to: string, body: string): Promise<{ sent: boolean }> {
  const { accessToken, phoneNumberId } = env.whatsapp.meta;
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`[whatsapp] Meta Cloud API send failed (${res.status}): ${await res.text()}`);
    return { sent: false };
  }

  return { sent: true };
}
