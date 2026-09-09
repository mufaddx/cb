import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import { DecideKycSchema, SubmitKycSchema } from "./kyc.validation";
import * as kycService from "./kyc.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requirePermission(Permission.KYC_SUBMIT_OWN),
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const input = SubmitKycSchema.parse(req.body);
    const record = await kycService.submitKyc(prisma, req.auth.creatorId, input);
    sendSuccess(res, record, "KYC submitted for review.", 201);
  })
);

router.get(
  "/me",
  requirePermission(Permission.KYC_SUBMIT_OWN),
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const status = await kycService.getMyKycStatus(prisma, req.auth.creatorId);
    sendSuccess(res, status);
  })
);

router.get(
  "/queue",
  requirePermission(Permission.KYC_REVIEW),
  asyncHandler(async (_req, res) => {
    const queue = await kycService.listKycQueue(prisma);
    sendSuccess(res, queue);
  })
);

router.get(
  "/:id",
  requirePermission(Permission.KYC_REVIEW),
  asyncHandler(async (req, res) => {
    const record = await kycService.getKycRecordForAdmin(prisma, req.params.id);
    sendSuccess(res, record);
  })
);

router.post(
  "/:id/decide",
  requirePermission(Permission.KYC_REVIEW),
  asyncHandler(async (req, res) => {
    const { decision, reason } = DecideKycSchema.parse(req.body);
    const record = await kycService.decideKyc(prisma, req.params.id, req.auth!.sub, decision, reason);
    sendSuccess(res, record, `KYC ${decision.toLowerCase().replace("_", " ")}.`);
  })
);

export default router;
