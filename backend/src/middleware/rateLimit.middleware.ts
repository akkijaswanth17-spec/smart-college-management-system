import rateLimit from "express-rate-limit";

// These limits are keyed by IP address (express-rate-limit's default), and a
// whole college campus typically sits behind one shared public IP via NAT.
// That collapses every student's requests into the SAME bucket — a limit
// that looks generous for one person (20 logins/15min) is exhausted almost
// immediately once dozens of students behind that one IP are all logging in
// during a feedback drive, blocking everyone else with "too many attempts"
// even though each individual student only tried once or twice. Raised well
// past any one legitimate user's real usage, while still bounding abuse from
// a single IP overall.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});
