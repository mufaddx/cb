import { Router } from "express";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { CreateBrandSchema, UpdateBrandSchema } from "./brands.validation";
import * as brandsService from "./brands.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = CreateBrandSchema.parse(req.body);
    const brand = await brandsService.createBrandProfile(prisma, req.auth!.sub, input);
    sendSuccess(res, brand, "Your brand profile is ready.", 201);
  })
);

router.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const input = UpdateBrandSchema.parse(req.body);
    const brand = await brandsService.updateBrandProfile(prisma, req.auth!.sub, input);
    sendSuccess(res, brand, "Company name updated.");
  })
);

export default router;
