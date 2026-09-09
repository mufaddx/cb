export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Every outbound email flows through this interface (spec §42). Domain
 * services call this — never Resend/SMTP directly — so the provider can
 * be swapped without touching business logic. */
export interface EmailProvider {
  send(input: SendEmailInput): Promise<{ providerMessageId: string }>;
}
