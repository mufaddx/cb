import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be set to a long random value"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be set to a long random value"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),

  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("Antigravity <notifications@yourdomain.com>"),

  STORAGE_PROVIDER: z.enum(["local", "r2"]).default("local"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("antigravity"),
  R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().default(900),

  INSTAGRAM_PROVIDER: z.enum(["mock", "meta"]).default("mock"),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),

  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  PAYMENT_PROVIDER_KEY: z.string().optional(),
  PAYMENT_PROVIDER_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  REDIS_URL: z.string().optional(),
  // In-process interval scheduler (see jobs/scheduler.ts) — single-
  // instance-safe only. A multi-instance deployment must replace this
  // with a real queue (BullMQ against REDIS_URL) before scaling out,
  // or every instance will run every job redundantly.
  ENABLE_BACKGROUND_JOBS: z.coerce.boolean().default(true),
  RETENTION_JOB_INTERVAL_MINUTES: z.coerce.number().default(60),
  OFFER_EXPIRY_JOB_INTERVAL_MINUTES: z.coerce.number().default(15),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Environment validation failed. See errors above and check .env against .env.example.");
  }

  // Cross-field checks: a provider selected as "real" must carry its credentials.
  const env = parsed.data;
  if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
    throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY to be set.");
  }
  if (env.STORAGE_PROVIDER === "r2" && (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY)) {
    throw new Error("STORAGE_PROVIDER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
  }
  if (env.PAYMENT_PROVIDER === "razorpay" && (!env.PAYMENT_PROVIDER_KEY || !env.PAYMENT_PROVIDER_SECRET)) {
    throw new Error("PAYMENT_PROVIDER=razorpay requires PAYMENT_PROVIDER_KEY and PAYMENT_PROVIDER_SECRET.");
  }
  if (env.INSTAGRAM_PROVIDER === "meta" && (!env.META_APP_ID || !env.META_APP_SECRET)) {
    throw new Error("INSTAGRAM_PROVIDER=meta requires META_APP_ID and META_APP_SECRET.");
  }

  return env;
}

export const env = loadEnv();
export type Env = typeof env;
