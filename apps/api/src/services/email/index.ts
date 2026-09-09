import { env } from "../../config/env";
import type { EmailProvider } from "./EmailProvider";
import { ConsoleEmailProvider } from "./ConsoleEmailProvider";
import { ResendEmailProvider } from "./ResendEmailProvider";

export * from "./EmailProvider";

let instance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (instance) return instance;

  if (env.EMAIL_PROVIDER === "resend") {
    instance = new ResendEmailProvider();
  } else {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "EMAIL_PROVIDER=console is not allowed in production. Configure Resend before deploying."
      );
    }
    instance = new ConsoleEmailProvider();
  }
  return instance;
}
