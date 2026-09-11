import { Router } from "express";
import { z } from "zod";
import { CampaignType, TargetingMetric } from "@prisma/client";
import { Permission } from "@antigravity/shared";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";

/**
 * The platform's rate card and tax/fee rules, editable from the admin
 * side — previously these only ever existed as seed data with no
 * route touching them at all, so "how much does the platform charge"
 * was fixed at whatever the seed script wrote, permanently. Gated on
 * its own permission (PRICING_MANAGE, held by Super Admin and Finance
 * Admin) rather than admin.routes.ts's blanket USER_MANAGE_ALL — a
 * finance admin who can manage payments/refunds/withdrawals but not
 * users should still be able to manage pricing.
 */
const router = Router();
router.use(requireAuth, requirePermission(Permission.PRICING_MANAGE));

router.get(
  "/pricing-slabs",
  asyncHandler(async (_req, res) => {
    const slabs = await prisma.pricingSlab.findMany({
      orderBy: [{ campaignType: "asc" }, { metric: "asc" }, { minValue: "asc" }],
    });
    sendSuccess(res, slabs);
  })
);

const CreateSlabSchema = z.object({
  campaignType: z.nativeEnum(CampaignType),
  metric: z.nativeEnum(TargetingMetric),
  minValue: z.number().int().nonnegative(),
  maxValue: z.number().int().positive().nullable(),
  payoutAmount: z.number().positive(),
  feeAmount: z.number().nonnegative(),
});

router.post(
  "/pricing-slabs",
  asyncHandler(async (req, res) => {
    const input = CreateSlabSchema.parse(req.body);
    const slab = await prisma.pricingSlab.create({
      data: { ...input, effectiveFrom: new Date(), active: true },
    });
    sendSuccess(res, slab, "Pricing band created.", 201);
  })
);

const UpdateSlabSchema = z.object({
  payoutAmount: z.number().positive().optional(),
  feeAmount: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});

router.patch(
  "/pricing-slabs/:id",
  asyncHandler(async (req, res) => {
    const input = UpdateSlabSchema.parse(req.body);
    // Existing campaigns already priced off this row keep their
    // stored CampaignPricingSnapshot untouched (spec: a rate change
    // can never retroactively alter an already-priced campaign) —
    // this only affects pricing computed for NEW campaigns from now on.
    const slab = await prisma.pricingSlab.update({ where: { id: req.params.id }, data: input });
    sendSuccess(res, slab, "Pricing band updated.");
  })
);

router.get(
  "/tax-rules",
  asyncHandler(async (_req, res) => {
    const rules = await prisma.taxRule.findMany({ orderBy: [{ applicableParty: "asc" }, { taxType: "asc" }] });
    sendSuccess(res, rules);
  })
);

const CreateTaxRuleSchema = z.object({
  taxType: z.string().min(1),
  rate: z.number().min(0).max(100),
  transactionType: z.string().min(1),
  applicableParty: z.enum(["BRAND", "CREATOR"]),
  jurisdiction: z.string().default("IN"),
});

router.post(
  "/tax-rules",
  asyncHandler(async (req, res) => {
    const input = CreateTaxRuleSchema.parse(req.body);
    const rule = await prisma.taxRule.create({ data: { ...input, effectiveFrom: new Date(), active: true } });
    sendSuccess(res, rule, "Tax/fee rule created.", 201);
  })
);

const UpdateTaxRuleSchema = z.object({
  rate: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

router.patch(
  "/tax-rules/:id",
  asyncHandler(async (req, res) => {
    const input = UpdateTaxRuleSchema.parse(req.body);
    const rule = await prisma.taxRule.update({ where: { id: req.params.id }, data: input });
    sendSuccess(res, rule, "Tax/fee rule updated.");
  })
);

export default router;
