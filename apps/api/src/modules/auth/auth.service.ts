import crypto from "crypto";
import bcrypt from "bcryptjs";
import { OtpPurpose, PrismaClient, UserStatus } from "@prisma/client";
import { AuditAction, Role } from "@antigravity/shared";
import { env } from "../../config/env";
import { ConflictError, RateLimitedError, UnauthenticatedError, ValidationError } from "../../lib/errors";
import { getEmailProvider } from "../../services/email";
import { recordAudit } from "../audit/audit.service";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../middleware/auth";
import type { SignupInput } from "./auth.validation";

const BCRYPT_ROUNDS = 12;

function generateOtpCode(): string {
  // 6-digit numeric OTP, cryptographically random.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0] ?? "*"}***@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

async function issueOtp(prisma: PrismaClient, userId: string, purpose: OtpPurpose): Promise<string> {
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
  const recent = await prisma.otpCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < cooldownMs) {
    throw new RateLimitedError(
      `Please wait before requesting another code (${env.OTP_RESEND_COOLDOWN_SECONDS}s cooldown).`
    );
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  await prisma.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000),
    },
  });
  return code;
}

export async function signup(prisma: PrismaClient, input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const roleName = input.accountType === "BRAND" ? Role.BRAND : Role.CREATOR;

  const user = await prisma.$transaction(async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { name: roleName } });
    const created = await tx.user.create({
      data: { email: input.email, passwordHash, status: UserStatus.PENDING_VERIFICATION },
    });
    await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
    await recordAudit(tx, {
      actorId: created.id,
      actorRole: roleName,
      action: AuditAction.USER_SIGNED_UP,
      entityType: "User",
      entityId: created.id,
      metadata: { accountType: input.accountType },
    });
    return created;
  });

  const code = await issueOtp(prisma, user.id, OtpPurpose.EMAIL_VERIFICATION);
  await getEmailProvider().send({
    to: user.email,
    subject: "Verify your email — Antigravity",
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`,
    text: `Your verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`,
  });

  return { userId: user.id, maskedEmail: maskEmail(user.email) };
}

export async function resendOtp(prisma: PrismaClient, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Do not reveal whether the account exists.
  if (!user || user.emailVerifiedAt) return { maskedEmail: maskEmail(email) };

  const code = await issueOtp(prisma, user.id, OtpPurpose.EMAIL_VERIFICATION);
  await getEmailProvider().send({
    to: user.email,
    subject: "Your new verification code — Antigravity",
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`,
    text: `Your verification code is ${code}.`,
  });
  return { maskedEmail: maskEmail(email) };
}

export async function verifyOtp(prisma: PrismaClient, email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ValidationError("Invalid or expired code");

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: OtpPurpose.EMAIL_VERIFICATION, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new ValidationError("Invalid or expired code");
  if (otp.expiresAt < new Date()) throw new ValidationError("This code has expired. Request a new one.");
  if (otp.attempts >= otp.maxAttempts) {
    throw new RateLimitedError("Too many incorrect attempts. Request a new code.");
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ValidationError("Incorrect code");
  }

  await prisma.$transaction(async (tx) => {
    await tx.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await tx.user.update({
      where: { id: user.id },
      data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
    });
    await recordAudit(tx, {
      actorId: user.id,
      actorRole: null,
      action: AuditAction.USER_EMAIL_VERIFIED,
      entityType: "User",
      entityId: user.id,
    });
  });

  return issueTokensFor(prisma, user.id);
}

export async function login(prisma: PrismaClient, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
  if (!user) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordAudit(prisma, {
      actorId: user.id,
      actorRole: null,
      action: AuditAction.USER_LOGIN_FAILED,
      entityType: "User",
      entityId: user.id,
    });
    throw new UnauthenticatedError("Invalid email or password");
  }

  if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
    throw new UnauthenticatedError("This account is not active. Contact support.");
  }
  if (!user.emailVerifiedAt) {
    throw new UnauthenticatedError("Please verify your email before logging in.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit(prisma, {
    actorId: user.id,
    actorRole: user.roles.map((r) => r.role.name).join(","),
    action: AuditAction.USER_LOGGED_IN,
    entityType: "User",
    entityId: user.id,
  });

  return issueTokensFor(prisma, user.id);
}

export async function refreshTokens(prisma: PrismaClient, refreshToken: string) {
  const { sub: userId } = verifyRefreshToken(refreshToken);
  return issueTokensFor(prisma, userId);
}

export async function forgotPassword(prisma: PrismaClient, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Do not reveal whether the account exists — same response either way.
  if (!user) return { maskedEmail: maskEmail(email) };

  const code = await issueOtp(prisma, user.id, OtpPurpose.PASSWORD_RESET);
  await recordAudit(prisma, {
    actorId: user.id,
    actorRole: null,
    action: AuditAction.USER_PASSWORD_RESET_REQUESTED,
    entityType: "User",
    entityId: user.id,
  });
  await getEmailProvider().send({
    to: user.email,
    subject: "Reset your password — Antigravity",
    html: `<p>Your password reset code is <strong>${code}</strong>. It expires in ${env.OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
    text: `Your password reset code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
  });
  return { maskedEmail: maskEmail(email) };
}

export async function resetPassword(prisma: PrismaClient, email: string, code: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ValidationError("Invalid or expired code");

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new ValidationError("Invalid or expired code");
  if (otp.expiresAt < new Date()) throw new ValidationError("This code has expired. Request a new one.");
  if (otp.attempts >= otp.maxAttempts) {
    throw new RateLimitedError("Too many incorrect attempts. Request a new code.");
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ValidationError("Incorrect code");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    await tx.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await recordAudit(tx, {
      actorId: user.id,
      actorRole: null,
      action: AuditAction.USER_PASSWORD_RESET,
      entityType: "User",
      entityId: user.id,
    });
  });

  // Log the user straight in — they just proved control of the account
  // via the emailed code, same trust level as a normal password login.
  return issueTokensFor(prisma, user.id);
}

async function issueTokensFor(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: { include: { role: true } }, brand: true, creator: true },
  });

  const roles = user.roles.map((r) => r.role.name as Role);
  const accessToken = signAccessToken({
    sub: user.id,
    roles,
    brandId: user.brand?.id,
    creatorId: user.creator?.id,
  });
  const refreshToken = signRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      roles,
      hasBrandProfile: Boolean(user.brand),
      hasCreatorProfile: Boolean(user.creator),
      brandOnboardingComplete: user.brand?.onboardingComplete ?? null,
      creatorOnboardingComplete: user.creator?.onboardingComplete ?? null,
    },
  };
}
