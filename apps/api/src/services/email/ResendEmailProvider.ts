import { Resend } from "resend";
import type { EmailProvider, SendEmailInput } from "./EmailProvider";
import { env } from "../../config/env";

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error("ResendEmailProvider requires RESEND_API_KEY");
    }
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async send(input: SendEmailInput): Promise<{ providerMessageId: string }> {
    const result = await this.client.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }

    return { providerMessageId: result.data?.id ?? "unknown" };
  }
}
