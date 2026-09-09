import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import { MarkFailedSchema, MarkPaidSchema, RequestWithdrawalSchema } from "./withdrawals.validation";
import * as withdrawalsService from "./withdrawals.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requirePermission(Permission.WITHDRAWAL_REQUEST_OWN),
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const { amount, upiId } = RequestWithdrawalSchema.parse(req.body);
    const withdrawal = await withdrawalsService.requestWithdrawal(prisma, req.auth.creatorId, amount, upiId);
    sendSuccess(res, withdrawal, "Withdrawal requested.", 201);
  })
);

router.get(
  "/",
  requirePermission(Permission.WITHDRAWAL_REQUEST_OWN),
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const withdrawals = await withdrawalsService.listMyWithdrawals(prisma, req.auth.creatorId);
    sendSuccess(res, withdrawals);
  })
);

router.get(
  "/queue",
  requirePermission(Permission.WITHDRAWAL_MANAGE_ALL),
  asyncHandler(async (_req, res) => {
    const queue = await withdrawalsService.listWithdrawalQueue(prisma);
    sendSuccess(res, queue);
  })
);

router.post(
  "/:id/approve",
  requirePermission(Permission.WITHDRAWAL_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const withdrawal = await withdrawalsService.approveWithdrawal(prisma, req.params.id, req.auth!.sub);
    sendSuccess(res, withdrawal, "Withdrawal approved.");
  })
);

router.post(
  "/:id/reject",
  requirePermission(Permission.WITHDRAWAL_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const { reason } = MarkFailedSchema.parse(req.body);
    const withdrawal = await withdrawalsService.rejectWithdrawal(prisma, req.params.id, req.auth!.sub, reason);
    sendSuccess(res, withdrawal, "Withdrawal rejected.");
  })
);

router.post(
  "/:id/mark-paid",
  requirePermission(Permission.WITHDRAWAL_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const { referenceNumber, proofKey } = MarkPaidSchema.parse(req.body);
    const withdrawal = await withdrawalsService.markWithdrawalPaid(prisma, req.params.id, req.auth!.sub, referenceNumber, proofKey);
    sendSuccess(res, withdrawal, "Withdrawal marked as paid.");
  })
);

router.post(
  "/:id/mark-failed",
  requirePermission(Permission.WITHDRAWAL_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const { reason } = MarkFailedSchema.parse(req.body);
    const withdrawal = await withdrawalsService.markWithdrawalFailed(prisma, req.params.id, req.auth!.sub, reason);
    sendSuccess(res, withdrawal, "Withdrawal marked as failed.");
  })
);

export default router;
