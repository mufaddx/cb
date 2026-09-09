import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import * as assignmentsService from "./assignments.service";

const router = Router();
router.use(requireAuth);

/** Ownership-scoped list: a creator sees their own assignments; a
 * brand sees assignments on campaigns they own. Never both at once —
 * "_OWN" permissions are enforced here, not just at the route gate. */
router.get(
  "/",
  requirePermission(Permission.ASSIGNMENT_READ_OWN),
  asyncHandler(async (req, res) => {
    const { creatorId, brandId } = req.auth!;
    const assignments = await prisma.campaignAssignment.findMany({
      where: creatorId ? { creatorId } : { campaign: { brandId } },
      include: { campaign: true, creator: true, shipment: true, shippingAddress: true },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, assignments);
  })
);

router.get(
  "/:id",
  requirePermission(Permission.ASSIGNMENT_READ_OWN),
  asyncHandler(async (req, res) => {
    const { creatorId, brandId } = req.auth!;
    const assignment = await prisma.campaignAssignment.findUnique({
      where: { id: req.params.id },
      include: { campaign: true, creator: true, contentSubmissions: true, postVerifications: true, retentionChecks: true },
    });
    if (!assignment) throw new NotFoundError("Assignment not found");
    const owns = creatorId ? assignment.creatorId === creatorId : assignment.campaign.brandId === brandId;
    if (!owns) throw new UnauthorizedError();
    sendSuccess(res, assignment);
  })
);

const SubmitPostSchema = z.object({
  postUrl: z.string().url(),
  screenshotKey: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  "/:id/submit-post",
  requirePermission(Permission.CONTENT_SUBMIT_OWN),
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const input = SubmitPostSchema.parse(req.body);
    const assignment = await assignmentsService.submitPost(prisma, req.params.id, req.auth.creatorId, input);
    sendSuccess(res, assignment, "Post submitted for verification.");
  })
);

export default router;
