import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import * as offersService from "./offers.service";

const AcceptOfferSchema = z.object({
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must confirm acceptance of the campaign terms" }),
  }),
});

const router = Router();
router.use(requireAuth);

function requireCreatorId(req: { auth?: { creatorId?: string } }): string {
  if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
  return req.auth.creatorId;
}

router.get(
  "/",
  requirePermission(Permission.OFFER_READ_OWN),
  asyncHandler(async (req, res) => {
    const offers = await offersService.listMyOffers(prisma, requireCreatorId(req));
    sendSuccess(res, offers);
  })
);

router.get(
  "/:id",
  requirePermission(Permission.OFFER_READ_OWN),
  asyncHandler(async (req, res) => {
    const offer = await offersService.viewOffer(prisma, req.params.id, requireCreatorId(req));
    sendSuccess(res, offer);
  })
);

router.post(
  "/:id/accept",
  requirePermission(Permission.OFFER_RESPOND_OWN),
  asyncHandler(async (req, res) => {
    const { termsAccepted } = AcceptOfferSchema.parse(req.body);
    const assignment = await offersService.acceptOffer(prisma, req.params.id, requireCreatorId(req), {
      termsAccepted,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    sendSuccess(res, assignment, "Offer accepted.");
  })
);

router.post(
  "/:id/reject",
  requirePermission(Permission.OFFER_RESPOND_OWN),
  asyncHandler(async (req, res) => {
    const offer = await offersService.rejectOffer(prisma, req.params.id, requireCreatorId(req));
    sendSuccess(res, offer, "Offer declined.");
  })
);

export default router;
