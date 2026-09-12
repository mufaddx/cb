import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  accountType: z.enum(["BRAND", "CREATOR"]),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  // Only meaningful for a CREATOR signup (ignored otherwise) — the
  // campaign-type preference they picked on the signup form, carried
  // forward to this step since the creator profile itself isn't
  // created until verification succeeds (see auth.service#verifyOtp).
  campaignPreferences: z.array(z.enum(["CLIPPING", "CREATOR_CONTENT"])).optional(),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const ResendOtpSchema = z.object({
  email: z.string().email(),
});
export type ResendOtpInput = z.infer<typeof ResendOtpSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const UpdateMeSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
});
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
