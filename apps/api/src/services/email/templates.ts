/**
 * Shared HTML shell for every transactional email this platform
 * sends. Previously each call site built its own bare `<p>` markup —
 * no branding, no layout, nothing that would read as coming from a
 * real product. This is one template every email routes through, so
 * the look only has to be right in one place.
 */

const BRAND_COLOR = "#4f46e5";
const TEXT_COLOR = "#111827";
const MUTED_COLOR = "#6b7280";
const BORDER_COLOR = "#e5e7eb";
const BG_COLOR = "#f6f7fb";

function shell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:28px;height:28px;border-radius:8px;background:${BRAND_COLOR};text-align:center;vertical-align:middle;font-size:15px;line-height:28px;">
                      <span style="color:#ffffff;">&#9889;</span>
                    </td>
                    <td style="padding-left:9px;font-size:17px;font-weight:700;color:${TEXT_COLOR};">Vidlix</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid ${BORDER_COLOR};color:${MUTED_COLOR};font-size:12.5px;">
                Vidlix — Creator Campaign Marketplace. If you didn't expect this email, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function codeBox(code: string): string {
  return `<div style="margin:20px 0;padding:16px;background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:10px;text-align:center;">
    <span style="font-size:28px;font-weight:700;letter-spacing:8px;color:${TEXT_COLOR};">${code}</span>
  </div>`;
}

function greetingLine(name: string | null): string {
  return name ? `Hi ${name},` : "Hi,";
}

export function verificationEmail(name: string | null, code: string, ttlMinutes: number) {
  const html = shell(`
    <p style="margin:0 0 4px;font-size:18px;font-weight:700;">Verify your email</p>
    <p style="margin:0 0 4px;">${greetingLine(name)}</p>
    <p style="margin:0;">Use this code to verify your Vidlix account:</p>
    ${codeBox(code)}
    <p style="margin:0;color:${MUTED_COLOR};">This code expires in ${ttlMinutes} minutes.</p>
  `);
  const text = `${greetingLine(name)} Your Vidlix verification code is ${code}. It expires in ${ttlMinutes} minutes.`;
  return { html, text };
}

export function resendVerificationEmail(name: string | null, code: string, ttlMinutes: number) {
  const html = shell(`
    <p style="margin:0 0 4px;font-size:18px;font-weight:700;">Your new verification code</p>
    <p style="margin:0 0 4px;">${greetingLine(name)}</p>
    <p style="margin:0;">Here's the new code you requested:</p>
    ${codeBox(code)}
    <p style="margin:0;color:${MUTED_COLOR};">This code expires in ${ttlMinutes} minutes.</p>
  `);
  const text = `${greetingLine(name)} Your new Vidlix verification code is ${code}. It expires in ${ttlMinutes} minutes.`;
  return { html, text };
}

export function passwordResetEmail(name: string | null, code: string, ttlMinutes: number) {
  const html = shell(`
    <p style="margin:0 0 4px;font-size:18px;font-weight:700;">Reset your password</p>
    <p style="margin:0 0 4px;">${greetingLine(name)}</p>
    <p style="margin:0;">Use this code to reset your Vidlix password:</p>
    ${codeBox(code)}
    <p style="margin:0;color:${MUTED_COLOR};">This code expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email — your password won't change.</p>
  `);
  const text = `${greetingLine(name)} Your Vidlix password reset code is ${code}. It expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.`;
  return { html, text };
}
