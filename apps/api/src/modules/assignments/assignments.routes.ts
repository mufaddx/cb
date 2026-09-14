import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import { getStorageProvider } from "../../services/storage";
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

/**
 * Admin's "View" page for one assignment — the same CampaignAssignment
 * record backs three separate admin queues (Content Review, Post
 * Verification, Retention Checks), so one detail endpoint with every
 * history table included serves all three instead of three near-copies.
 * Gated on CONTENT_REVIEW (every admin role that can act on an
 * assignment — SUPER_ADMIN, OPERATIONS_ADMIN, CONTENT_REVIEWER — holds
 * it); a brand/creator already has their own scoped GET /:id above.
 */
router.get(
  "/:id/admin",
  requirePermission(Permission.CONTENT_REVIEW),
  asyncHandler(async (req, res) => {
    const assignment = await prisma.campaignAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: { include: { brand: true } },
        creator: { include: { instagramAccount: true } },
        contentSubmissions: { orderBy: { version: "desc" }, include: { revisions: true } },
        postVerifications: { orderBy: { createdAt: "desc" } },
        retentionChecks: { orderBy: { checkDate: "desc" } },
      },
    });
    if (!assignment) throw new NotFoundError("Assignment not found");

    const storage = getStorageProvider();
    const [postScreenshotUrl, contentSubmissions] = await Promise.all([
      assignment.postScreenshotKey ? storage.getSignedDownloadUrl(assignment.postScreenshotKey) : null,
      Promise.all(
        assignment.contentSubmissions.map(async (s) => ({ ...s, fileUrl: await storage.getSignedDownloadUrl(s.fileKey) }))
      ),
    ]);

    sendSuccess(res, { ...assignment, postScreenshotUrl, contentSubmissions });
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
