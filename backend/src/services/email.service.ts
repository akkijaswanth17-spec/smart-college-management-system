import { env } from "../config/env";

/**
 * The ONLY place that talks to an email provider. No other file should
 * import nodemailer / an email SDK directly — this keeps "is email actually
 * configured" a single decision point instead of scattered checks.
 *
 * Until EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD are set in .env, this is a
 * deliberate no-op: it logs the message server-side and reports
 * `sent: false` rather than pretending delivery happened. Callers must
 * surface that honestly to the end user (e.g. show the code directly in a
 * clearly-labeled "email isn't configured yet" dev notice) instead of
 * claiming "check your inbox" when nothing was actually sent.
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<{ sent: boolean }> {
  if (!env.emailConfigured) {
    // eslint-disable-next-line no-console
    console.log(`[email] NOT SENT — no email provider configured. Password reset code for ${to}: ${code}`);
    return { sent: false };
  }

  // TODO: wire up a real provider here (e.g. nodemailer + SMTP, or an API
  // like Resend) once EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD are set.
  // Left unimplemented on purpose — emailConfigured is currently always
  // false until those env vars are filled in, so this branch doesn't run.
  return { sent: false };
}
