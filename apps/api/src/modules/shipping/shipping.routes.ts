import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import { ConfirmReceiptSchema, CreateShipmentSchema, SubmitAddressSchema } from "./shipping.validation";
import * as shippingService from "./shipping.service";

const router = Router();
router.use(requireAuth);

function requireCreatorId(req: { auth?: { creatorId?: string } }): string {
  if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
  return req.auth.creatorId;
}
function requireBrandId(req: { auth?: { brandId?: string } }): string {
  if (!req.auth?.brandId) throw new UnauthorizedError("This action requires a brand profile");
  return req.auth.brandId;
}

router.post(
  "/:assignmentId/address",
  requirePermission(Permission.SHIPPING_MANAGE_OWN),
  asyncHandler(async (req, res) => {
    const input = SubmitAddressSchema.parse(req.body);
    const address = await shippingService.submitShippingAddress(prisma, req.params.assignmentId, requireCreatorId(req), input);
    sendSuccess(res, address, "Shipping address submitted.", 201);
  })
);

router.post(
  "/:assignmentId/ship",
  requirePermission(Permission.SHIPMENT_MANAGE_OWN),
  asyncHandler(async (req, res) => {
    const input = CreateShipmentSchema.parse(req.body);
    const shipment = await shippingService.createShipment(prisma, req.params.assignmentId, requireBrandId(req), input);
    sendSuccess(res, shipment, "Marked as shipped.");
  })
);

router.post(
  "/:assignmentId/report-issue",
  requirePermission(Permission.SHIPMENT_MANAGE_OWN),
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string().min(3) }).parse(req.body);
    const shipment = await shippingService.reportDeliveryIssue(prisma, req.params.assignmentId, requireBrandId(req), reason);
    sendSuccess(res, shipment, "Delivery issue recorded.");
  })
);

router.post(
  "/:assignmentId/confirm-received",
  requirePermission(Permission.SHIPPING_MANAGE_OWN),
  asyncHandler(async (req, res) => {
    const { proofKey } = ConfirmReceiptSchema.parse(req.body);
    const shipment = await shippingService.confirmReceipt(prisma, req.params.assignmentId, requireCreatorId(req), proofKey);
    sendSuccess(res, shipment, "Receipt confirmed. You can now create your content.");
  })
);

export default router;
