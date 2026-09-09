import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";

/**
 * Admin directory + platform-wide analytics (spec §46/§89). Kept as
 * its own small module rather than bolted onto `modules/creators` or
 * `modules/brands` — those modules are scoped to a user managing
 * their OWN profile; this one is explicitly "any admin looking across
 * everyone," a different permission boundary (USER_MANAGE_ALL /
 * AUDIT_READ_ALL) and a different set of queries (aggregates, not a
 * single owner's record).
 */
const router = Router();
router.use(requireAuth, requirePermission(Permission.USER_MANAGE_ALL));

router.get(
  "/creators",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.q === "string" ? req.query.q : undefined;
    const creators = await prisma.creator.findMany({
      where: search
        ? { OR: [{ fullName: { contains: search } }, { displayName: { contains: search } }] }
        : undefined,
      include: { instagramAccount: true, categories: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    sendSuccess(res, creators);
  })
);

router.get(
  "/creators/:id",
  asyncHandler(async (req, res) => {
    const creator = await prisma.creator.findUnique({
      where: { id: req.params.id },
      include: {
        instagramAccount: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
        categories: { include: { category: true } },
        assignments: { include: { campaign: true }, orderBy: { createdAt: "desc" }, take: 20 },
        kycRecords: { orderBy: { submittedAt: "desc" }, take: 5 },
      },
    });
    sendSuccess(res, creator);
  })
);

router.get(
  "/brands",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.q === "string" ? req.query.q : undefined;
    const brands = await prisma.brand.findMany({
      where: search ? { companyName: { contains: search } } : undefined,
      include: { _count: { select: { campaigns: true, products: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    sendSuccess(res, brands);
  })
);

router.get(
  "/brands/:id",
  asyncHandler(async (req, res) => {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id },
      include: {
        campaigns: { orderBy: { createdAt: "desc" }, take: 20 },
        wallet: true,
        categories: { include: { category: true } },
      },
    });
    sendSuccess(res, brand);
  })
);

/**
 * Platform-wide analytics (spec §89's admin section: GMV, revenue,
 * campaigns, brands, creators, payments, refunds, withdrawals,
 * disputes). Every number here is a real aggregate query — nothing
 * fabricated for unavailable metrics.
 */
router.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const [
      totalBrands,
      totalCreators,
      totalCampaigns,
      liveCampaigns,
      completedCampaigns,
      paymentAgg,
      refundAgg,
      payoutAgg,
      pendingWithdrawals,
      openDisputes,
      openFraudFlags,
    ] = await Promise.all([
      prisma.brand.count(),
      prisma.creator.count(),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "LIVE" } }),
      prisma.campaign.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
      prisma.refund.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
      prisma.walletTransaction.aggregate({ where: { type: "CREATOR_EARNING" }, _sum: { amount: true } }),
      prisma.withdrawal.count({ where: { status: { in: ["REQUESTED", "UNDER_REVIEW", "APPROVED"] } } }),
      prisma.dispute.count({ where: { status: { not: "RESOLVED" } } }),
      prisma.fraudFlag.count({ where: { status: "OPEN" } }),
    ]);

    const gmv = Number(paymentAgg._sum.amount ?? 0);
    const totalRefunded = Number(refundAgg._sum.amount ?? 0);
    const totalPaidToCreators = Number(payoutAgg._sum.amount ?? 0);

    sendSuccess(res, {
      brands: totalBrands,
      creators: totalCreators,
      campaigns: { total: totalCampaigns, live: liveCampaigns, completed: completedCampaigns },
      gmv,
      netRevenueEstimate: gmv - totalRefunded - totalPaidToCreators,
      payments: { count: paymentAgg._count, totalAmount: gmv },
      refunds: { count: refundAgg._count, totalAmount: totalRefunded },
      creatorPayouts: { totalAmount: totalPaidToCreators },
      pendingWithdrawals,
      openDisputes,
      openFraudFlags,
    });
  })
);

export default router;
