import app from "./app";
import { env } from "./config/env";
import { startReminderScheduler } from "./jobs/reminder.scheduler";

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Smart College backend running on http://localhost:${env.port} (${env.nodeEnv})`);
  startReminderScheduler();
});
