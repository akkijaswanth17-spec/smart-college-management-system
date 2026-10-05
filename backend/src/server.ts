import app from "./app";
import { env } from "./config/env";
// import { startReminderScheduler } from "./jobs/reminder.scheduler";

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Smart College backend running on http://localhost:${env.port} (${env.nodeEnv})`);
  // Temporarily disabled: this polled the database every minute and kept the
  // Neon free-tier compute endpoint permanently active, exhausting the
  // monthly compute-hour quota and suspending the database. Re-enable once
  // the polling interval is widened (e.g. every 5-10 minutes) so the
  // database can scale to zero between checks.
  // startReminderScheduler();
});
