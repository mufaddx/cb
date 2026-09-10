import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email(),
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
