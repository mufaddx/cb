import { Router } from "express";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import { CreateCreatorSchema, UpdateCreatorSchema } from "./creators.validation";
import * as creatorsService from "./creators.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = CreateCreatorSchema.parse(req.body);
    const creator = await creatorsService.createCreatorProfile(prisma, req.auth!.sub, input);
    sendSuccess(res, creator, "Your creator profile is ready.", 201);
  })
);

// Registered before nothing else needs it — "/me" isn't ambiguous
// with "/" above, only with a future "/:id" this module doesn't have.
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const creator = await creatorsService.getMyCreatorProfile(prisma, req.auth.sub);
    sendSuccess(res, creator);
  })
);

router.patch(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
    const input = UpdateCreatorSchema.parse(req.body);
    const creator = await creatorsService.updateCreatorProfile(prisma, req.auth.sub, input);
    sendSuccess(res, creator, "Profile updated.");
  })
);

/**
 * Top creators by quality score / completion rate — a brand deciding
 * who to work with, not the admin directory (admin.routes.ts's
 * /creators is the full record, gated on USER_MANAGE_ALL). Deliberately
 * a narrow field set: nothing a brand shouldn't see (KYC, phone, raw
 * risk score) about a creator it hasn't worked with yet — and name/
 * Instagram handle themselves stay masked until a credit unlocks them.
 */
router.get(
  "/top",
  asyncHandler(async (req, res) => {
    if (!req.auth?.brandId) throw new UnauthorizedError("This action requires a brand profile");
    const { categoryId, metric, minValue, maxValue } = req.query as Record<string, string | undefined>;
    const creators = await creatorsService.listTopCreators(prisma, req.auth.brandId, {
      categoryId: categoryId || undefined,
      metric: metric === "AVERAGE_REACH" ? "AVERAGE_REACH" : metric === "FOLLOWER_COUNT" ? "FOLLOWER_COUNT" : undefined,
      minValue: minValue ? Number(minValue) : undefined,
      maxValue: maxValue ? Number(maxValue) : undefined,
    });
    sendSuccess(res, creators);
  })
);

// Fixed path, registered before "/:id/unlock" for the same reason as
// "/top" and "/me" above (a fixed segment doesn't actually collide
// with ":id/unlock", but the convention is kept anyway).
router.get(
  "/follower-ranges",
  asyncHandler(async (req, res) => {
    if (!req.auth?.brandId) throw new UnauthorizedError("This action requires a brand profile");
    const metric = req.query.metric === "AVERAGE_REACH" ? "AVERAGE_REACH" : "FOLLOWER_COUNT";
    const ranges = await creatorsService.getFollowerRanges(prisma, metric);
    sendSuccess(res, ranges);
  })
);

router.post(
  "/:id/unlock",
  asyncHandler(async (req, res) => {
    if (!req.auth?.brandId) throw new UnauthorizedError("This action requires a brand profile");
    const result = await creatorsService.unlockCreatorProfile(prisma, req.auth.brandId, req.params.id);
    sendSuccess(res, result, result.alreadyUnlocked ? "Already unlocked." : "Profile unlocked.");
  })
);

export default router;
