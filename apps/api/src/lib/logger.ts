import pino from "pino";
import { env } from "../config/env";

// Spec §93: log business/security events, never secrets. Redact known
// sensitive field names defensively regardless of where they appear.
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.accessToken",
      "*.accessTokenEncrypted",
      "*.otp",
      "*.codeHash",
      "*.upiId",
      "*.documentNumberEncrypted",
    ],
    remove: true,
  },
});
