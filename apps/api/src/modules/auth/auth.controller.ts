import type { Request, Response } from "express";
import { prisma } from "@antigravity/db";
import { sendSuccess } from "../../lib/apiResponse";
import * as authService from "./auth.service";
import {
  ForgotPasswordSchema,
  LoginSchema,
  RefreshSchema,
  ResendOtpSchema,
  ResetPasswordSchema,
  SignupSchema,
  VerifyOtpSchema,
} from "./auth.validation";

export async function signupHandler(req: Request, res: Response) {
  const input = SignupSchema.parse(req.body);
  const result = await authService.signup(prisma, input);
  sendSuccess(res, result, "Account created. Check your email for a verification code.", 201);
}

export async function resendOtpHandler(req: Request, res: Response) {
  const input = ResendOtpSchema.parse(req.body);
  const result = await authService.resendOtp(prisma, input.email);
  sendSuccess(res, result, "If this account exists, a new code has been sent.");
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const input = VerifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtp(prisma, input.email, input.code);
  sendSuccess(res, result, "Email verified successfully.");
}

export async function loginHandler(req: Request, res: Response) {
  const input = LoginSchema.parse(req.body);
  const result = await authService.login(prisma, input.email, input.password);
  sendSuccess(res, result, "Logged in successfully.");
}

export async function refreshHandler(req: Request, res: Response) {
  const input = RefreshSchema.parse(req.body);
  const result = await authService.refreshTokens(prisma, input.refreshToken);
  sendSuccess(res, result, "Token refreshed.");
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const input = ForgotPasswordSchema.parse(req.body);
  const result = await authService.forgotPassword(prisma, input.email);
  sendSuccess(res, result, "If this account exists, a reset code has been sent.");
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const input = ResetPasswordSchema.parse(req.body);
  const result = await authService.resetPassword(prisma, input.email, input.code, input.newPassword);
  sendSuccess(res, result, "Password reset successfully.");
}

export async function meHandler(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.sub },
    include: { roles: { include: { role: true } }, brand: true, creator: true },
  });
  sendSuccess(res, {
    id: user.id,
    email: user.email,
    roles: user.roles.map((r) => r.role.name),
    brand: user.brand,
    creator: user.creator,
  });
}
