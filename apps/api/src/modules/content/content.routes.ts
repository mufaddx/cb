import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import { ReviewContentSchema, SubmitContentSchema } from "./content.validation";
import * as contentService from "./content.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/:assignmentId/submit",
  requirePermission(Permission.CONTENT_SUBMIT_OWN),
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const { fileKey } = SubmitContentSchema.parse(req.body);
    const submission = await contentService.submitContent(prisma, req.params.assignmentId, req.auth.creatorId, fileKey);
    sendSuccess(res, submission, "Content submitted for review.", 201);
  })
);

router.get(
  "/queue",
  requirePermission(Permission.CONTENT_REVIEW),
  asyncHandler(async (_req, res) => {
    const queue = await contentService.listContentReviewQueue(prisma);
    sendSuccess(res, queue);
  })
);

/** Accepts either an admin (CONTENT_REVIEW, any campaign) or a brand
 * (CONTENT_REVIEW_OWN, its own campaign only — enforced inside the
 * service via `callerBrandId`). */
router.post(
  "/:assignmentId/review",
  asyncHandler(async (req, res) => {
    const hasAdminPerm = req.auth!.roles.some((r) => r === "OPERATIONS_ADMIN" || r === "SUPER_ADMIN" || r === "CONTENT_REVIEWER");
    if (!hasAdminPerm && !req.auth?.brandId) {
      throw new UnauthorizedError("This action requires a brand profile or content-review admin role");
    }
    const input = ReviewContentSchema.parse(req.body);
    const result = await contentService.reviewContent(prisma, req.params.assignmentId, req.auth!.sub, req.auth!.roles, input, req.auth?.brandId);
    sendSuccess(res, result, `Content ${input.decision.toLowerCase()}.`);
  })
);

export default router;
