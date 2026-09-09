import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import * as retentionService from "./retention.service";

const router = Router();
router.use(requireAuth, requirePermission(Permission.RETENTION_MANAGE));

router.get(
  "/queue",
  asyncHandler(async (_req, res) => {
    const queue = await retentionService.listRetentionQueue(prisma);
    sendSuccess(res, queue);
  })
);

/**
 * No background scheduler exists yet (see docs/architecture.md) — this
 * is the stand-in "run the due checks" trigger an admin (or, later, a
 * cron job hitting this same service function) calls.
 */
router.post(
  "/run-due",
  asyncHandler(async (_req, res) => {
    const results = await retentionService.runDueRetentionChecks(prisma);
    sendSuccess(res, results, `Ran ${results.length} due retention check(s).`);
  })
);

router.post(
  "/:assignmentId/check",
  asyncHandler(async (req, res) => {
    const result = await retentionService.runRetentionCheck(prisma, req.params.assignmentId);
    sendSuccess(res, result);
  })
);

export default router;
