import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  collegeTimezone: process.env.COLLEGE_TIMEZONE ?? "Asia/Kolkata",
  uploadDir: path.resolve(__dirname, "../../../", process.env.UPLOAD_DIR ?? "uploads"),
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? "5", 10),
  isProduction: process.env.NODE_ENV === "production",

  email: {
    host: process.env.EMAIL_HOST ?? "",
    port: parseInt(process.env.EMAIL_PORT ?? "587", 10),
    user: process.env.EMAIL_USER ?? "",
    password: process.env.EMAIL_PASSWORD ?? "",
  },
  get emailConfigured() {
    return Boolean(this.email.host && this.email.user && this.email.password);
  },

  // WhatsApp class-reminder messages. Provider is pluggable — set
  // WHATSAPP_PROVIDER to "twilio" or "meta" once you've picked one and have
  // real credentials. Both branches stay unconfigured (and therefore inert)
  // until their own required values are filled in.
  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER ?? "").toLowerCase(),
    defaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "91",
    twilio: {
      accountSid: process.env.WHATSAPP_TWILIO_ACCOUNT_SID ?? "",
      authToken: process.env.WHATSAPP_TWILIO_AUTH_TOKEN ?? "",
      fromNumber: process.env.WHATSAPP_TWILIO_FROM_NUMBER ?? "", // e.g. "whatsapp:+14155238886"
    },
    meta: {
      accessToken: process.env.WHATSAPP_META_ACCESS_TOKEN ?? "",
      phoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID ?? "",
    },
  },
  get whatsappConfigured() {
    if (this.whatsapp.provider === "twilio") {
      return Boolean(this.whatsapp.twilio.accountSid && this.whatsapp.twilio.authToken && this.whatsapp.twilio.fromNumber);
    }
    if (this.whatsapp.provider === "meta") {
      return Boolean(this.whatsapp.meta.accessToken && this.whatsapp.meta.phoneNumberId);
    }
    return false;
  },

  // Web Push — real, free phone/browser notifications. No third-party
  // account required; VAPID_* just identifies this server to push services.
  webPush: {
    subject: process.env.VAPID_SUBJECT ?? "",
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  },
  get webPushConfigured() {
    return Boolean(this.webPush.subject && this.webPush.publicKey && this.webPush.privateKey);
  },
};
