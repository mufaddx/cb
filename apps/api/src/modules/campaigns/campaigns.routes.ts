import { Router } from "express";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requireAnyPermission, requirePermission } from "../../middleware/rbac";
import * as controller from "./campaigns.controller";

const router = Router();
router.use(requireAuth);

router.post("/", requirePermission(Permission.CAMPAIGN_CREATE_OWN), asyncHandler(controller.createCampaignHandler));
router.get("/", requirePermission(Permission.CAMPAIGN_READ_OWN), asyncHandler(controller.listMyCampaignsHandler));

// Registered before "/:id" — a fixed two-segment path like this
// doesn't actually collide with a one-segment "/:id" pattern, but the
// convention (fixed paths before parameterized ones) is kept anyway
// so this file stays a correct example to copy (see docs/architecture.md).
router.get(
  "/review-queue",
  requirePermission(Permission.CAMPAIGN_REVIEW),
  asyncHandler(controller.getCampaignReviewQueueHandler)
);

router.get(
  "/:id",
  requireAnyPermission(Permission.CAMPAIGN_READ_OWN, Permission.CAMPAIGN_READ_ALL),
  asyncHandler(controller.getCampaignHandler)
);
router.get("/:id/offers", requirePermission(Permission.CAMPAIGN_READ_OWN), asyncHandler(controller.getCampaignOffersHandler));
// No single permission fits both callers (owning brand vs. an
// accepted creator) — getCampaignSourceAssetKey does the real
// authorization check itself, so this just requires *some* login.
router.get("/:id/source-asset", asyncHandler(controller.getCampaignSourceAssetHandler));
router.post("/:id/submit", requirePermission(Permission.CAMPAIGN_CREATE_OWN), asyncHandler(controller.submitCampaignHandler));
router.post("/:id/cancel", requirePermission(Permission.CAMPAIGN_CANCEL_OWN), asyncHandler(controller.cancelCampaignHandler));

router.post("/:id/approve", requirePermission(Permission.CAMPAIGN_REVIEW), asyncHandler(controller.approveCampaignHandler));
router.post("/:id/reject", requirePermission(Permission.CAMPAIGN_REVIEW), asyncHandler(controller.rejectCampaignHandler));

export default router;
