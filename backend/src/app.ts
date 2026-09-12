import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import routes from "./routes";
import { prisma } from "./config/prisma";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimit.middleware";

const app = express();

// Sits behind an Nginx reverse proxy in production — without this, rate
// limiting and req.ip would see every request as coming from Nginx itself.
if (env.isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (!env.isProduction) {
  app.use(morgan("dev"));
}

app.use(apiRateLimiter);

// Static file serving for uploaded content (notices, lost & found images, timetable photos, branding).
app.use("/uploads", express.static(env.uploadDir));

// Downloadable CSV templates for the admin data-import flows.
app.use("/import-templates", express.static(path.resolve(__dirname, "../../import-templates")));

app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok" }));

// TEMPORARY — diagnosing why production login fails; aggregate counts only,
// no personal data. Remove once the data question is settled.
app.get("/api/health/db-counts", async (_req, res) => {
  const [students, faculty, admins, departments] = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.department.count(),
  ]);
  res.json({ success: true, data: { students, faculty, admins, departments } });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
