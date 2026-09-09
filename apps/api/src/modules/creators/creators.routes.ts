import { Router } from "express";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { CreateCreatorSchema } from "./creators.validation";
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

export default router;
