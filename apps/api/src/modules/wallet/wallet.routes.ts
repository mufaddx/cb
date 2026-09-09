import { Router } from "express";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { NotFoundError } from "../../lib/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { brandId, creatorId } = req.auth!;
    const wallet = await prisma.wallet.findFirst({
      where: brandId ? { brandId } : { creatorId },
    });
    if (!wallet) throw new NotFoundError("Wallet not found");
    sendSuccess(res, wallet);
  })
);

router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const { brandId, creatorId } = req.auth!;
    const wallet = await prisma.wallet.findFirst({ where: brandId ? { brandId } : { creatorId } });
    if (!wallet) throw new NotFoundError("Wallet not found");
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    sendSuccess(res, transactions);
  })
);

export default router;
