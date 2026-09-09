import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import * as verificationService from "./verification.service";

const router = Router();
router.use(requireAuth, requirePermission(Permission.CONTENT_REVIEW));

router.get(
  "/queue",
  asyncHandler(async (_req, res) => {
    const queue = await verificationService.listVerificationQueue(prisma);
    sendSuccess(res, queue);
  })
);

const DecideSchema = z.object({
  decision: z.enum(["PASS", "FAIL"]),
  notes: z.string().optional(),
});

router.post(
  "/:assignmentId/decide",
  asyncHandler(async (req, res) => {
    const { decision, notes } = DecideSchema.parse(req.body);
    const assignment = await verificationService.decideVerification(prisma, req.params.assignmentId, req.auth!.sub, decision, notes);
    sendSuccess(res, assignment, `Verification ${decision === "PASS" ? "passed" : "failed"}.`);
  })
);

export default router;
