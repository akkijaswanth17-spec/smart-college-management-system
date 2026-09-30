import cron from "node-cron";
import { env } from "../config/env";
import { runReminderCheck } from "../services/reminder.service";

/**
 * Server-side scheduler for the five-minute class reminder. Runs every
 * minute from 6 AM to 9 PM (no college holds classes outside that window),
 * evaluated in COLLEGE_TIMEZONE so it stays correct regardless of the host
 * server's own timezone. This must run in the backend process — a browser
 * timer would stop the moment the tab closes.
 *
 * Restricted to daytime hours (rather than "* * * * *") because polling the
 * database every minute around the clock keeps the Neon compute endpoint
 * permanently active, which burns through the free tier's monthly
 * compute-hour quota well before the month ends and suspends the database.
 */
export function startReminderScheduler() {
  cron.schedule(
    "* 6-20 * * *",
    async () => {
      try {
        const { sent } = await runReminderCheck();
        if (sent > 0) {
          // eslint-disable-next-line no-console
          console.log(`[reminder-scheduler] sent ${sent} class reminder(s)`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[reminder-scheduler] error:", err);
      }
    },
    { timezone: env.collegeTimezone }
  );

  // eslint-disable-next-line no-console
  console.log(`[reminder-scheduler] started (timezone: ${env.collegeTimezone})`);
}
