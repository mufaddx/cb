import { randomUUID } from "crypto";
import type { EmailProvider, SendEmailInput } from "./EmailProvider";
import { logger } from "../../lib/logger";

/** Dev-only adapter: logs the email instead of sending it. Used when
 * EMAIL_PROVIDER=console (no Resend credentials configured yet). Never
 * enabled in production — see index.ts factory guard. */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<{ providerMessageId: string }> {
    const providerMessageId = `console_${randomUUID()}`;
    logger.info(
      { to: input.to, subject: input.subject, providerMessageId },
      `[dev email] Would send "${input.subject}" to ${input.to}`
    );
    // eslint-disable-next-line no-console
    console.log(`\n--- DEV EMAIL ---\nTo: ${input.to}\nSubject: ${input.subject}\n${input.text ?? input.html}\n-----------------\n`);
    return { providerMessageId };
  }
}
