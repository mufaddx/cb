import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import * as matchingService from "./matching.service";

const router = Router();

router.post(
  "/:id/match",
  requireAuth,
  requirePermission(Permission.MATCHING_TRIGGER),
  asyncHandler(async (req, res) => {
    const result = await matchingService.createOffersForCampaign(prisma, req.params.id, req.auth!.sub);
    sendSuccess(res, result, "Matching run complete.");
  })
);

export default router;
