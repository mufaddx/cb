import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { CreateFlagSchema, ReviewFlagSchema } from "./fraud.validation";
import * as fraudService from "./fraud.service";

const router = Router();
router.use(requireAuth, requirePermission(Permission.FRAUD_MANAGE));

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = CreateFlagSchema.parse(req.body);
    const flag = await fraudService.raiseFlag(prisma, input, req.auth!.sub);
    sendSuccess(res, flag, "Flag raised.", 201);
  })
);

router.get(
  "/queue",
  asyncHandler(async (_req, res) => {
    const queue = await fraudService.listFlagQueue(prisma);
    sendSuccess(res, queue);
  })
);

router.get(
  "/entity/:entityType/:entityId",
  asyncHandler(async (req, res) => {
    const flags = await fraudService.getFlagsForEntity(prisma, req.params.entityType, req.params.entityId);
    sendSuccess(res, flags);
  })
);

router.post(
  "/:id/review",
  asyncHandler(async (req, res) => {
    const { decision, notes } = ReviewFlagSchema.parse(req.body);
    const flag = await fraudService.reviewFlag(prisma, req.params.id, req.auth!.sub, decision, notes);
    sendSuccess(res, flag, `Flag ${decision.toLowerCase()}.`);
  })
);

export default router;
