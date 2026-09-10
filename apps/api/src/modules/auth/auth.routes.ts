import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import * as controller from "./auth.controller";

const router = Router();

// Tighter rate limit on auth endpoints than the global default —
// these are the highest-value brute-force / OTP-guessing targets.
const authLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
const otpLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post("/signup", authLimiter, asyncHandler(controller.signupHandler));
router.post("/otp/resend", otpLimiter, asyncHandler(controller.resendOtpHandler));
router.post("/otp/verify", otpLimiter, asyncHandler(controller.verifyOtpHandler));
router.post("/login", authLimiter, asyncHandler(controller.loginHandler));
router.post("/refresh", authLimiter, asyncHandler(controller.refreshHandler));
router.post("/password/forgot", otpLimiter, asyncHandler(controller.forgotPasswordHandler));
router.post("/password/reset", otpLimiter, asyncHandler(controller.resetPasswordHandler));
router.get("/me", requireAuth, asyncHandler(controller.meHandler));
router.post("/logout", requireAuth, asyncHandler(controller.logoutHandler));

export default router;
