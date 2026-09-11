import { Router } from "express";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";

const router = Router();
router.use(requireAuth);

/**
 * The category picker both a creator's own profile (their niche) and
 * a brand's campaign (who it should reach) need — until now there was
 * no route exposing the seeded Category table at all, so neither
 * picker could exist. Seeded flat (no parent/child in active use), so
 * this returns the whole list rather than a tree.
 */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    sendSuccess(res, categories);
  })
);

export default router;
