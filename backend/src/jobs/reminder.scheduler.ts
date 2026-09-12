import cron from "node-cron";
import { env } from "../config/env";
import { runReminderCheck } from "../services/reminder.service";

/**
 * Server-side scheduler for the five-minute class reminder. Runs every
 * minute, evaluated in COLLEGE_TIMEZONE so it stays correct regardless of
 * the host server's own timezone. This must run in the backend process —
 * a browser timer would stop the moment the tab closes.
 */
export function startReminderScheduler() {
  cron.schedule(
    "* * * * *",
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
