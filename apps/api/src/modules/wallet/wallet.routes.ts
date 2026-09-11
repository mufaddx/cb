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

    // Surfaced only for creators — this is the same rate
    // payouts.service.ts actually deducts, read live so it can never
    // drift from what a payout will really apply.
    let platformFeePct: number | null = null;
    if (creatorId) {
      const rules = await prisma.taxRule.findMany({
        where: { transactionType: "PLATFORM_FEE", applicableParty: "CREATOR", active: true },
      });
      platformFeePct = rules.reduce((sum, r) => sum + Number(r.rate), 0);
    }

    sendSuccess(res, { ...wallet, platformFeePct });
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
