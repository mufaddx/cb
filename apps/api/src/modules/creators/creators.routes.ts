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

export default router;
