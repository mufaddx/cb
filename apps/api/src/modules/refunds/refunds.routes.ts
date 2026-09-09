import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { RequestRefundSchema } from "./refunds.validation";
import * as refundsService from "./refunds.service";

const router = Router();
router.use(requireAuth, requirePermission(Permission.REFUND_MANAGE_ALL));

router.post(
  "/:paymentId/refund",
  asyncHandler(async (req, res) => {
    const { amount, reason } = RequestRefundSchema.parse(req.body);
    const refund = await refundsService.issueRefund(prisma, req.params.paymentId, req.auth!.sub, amount, reason);
    sendSuccess(res, refund, "Refund issued.");
  })
);

router.get(
  "/:paymentId/refunds",
  asyncHandler(async (req, res) => {
    const refunds = await refundsService.listRefundsForPayment(prisma, req.params.paymentId);
    sendSuccess(res, refunds);
  })
);

export default router;
