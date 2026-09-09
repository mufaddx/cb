import { CampaignType, PrismaClient, TargetingMetric } from "@prisma/client";
import { ValidationError } from "../../lib/errors";

export interface TargetingSlabInput {
  minValue: number;
  maxValue: number | null;
  payoutAmount: number;
  quantity: number;
}

export interface PricingBreakdown {
  subtotal: number;
  platformFee: number;
  taxAmount: number;
  totalAmount: number;
  snapshot: Record<string, unknown>;
}

/**
 * Computes campaign pricing from the live PricingSlab / TaxRule tables
 * — never a hardcoded rate (spec §04 step05, §47, §63). The result is
 * persisted verbatim as a CampaignPricingSnapshot so a later change to
 * a pricing/tax rule can never retroactively alter an already-priced
 * campaign.
 */
export async function computePricingBreakdown(
  prisma: PrismaClient,
  campaignType: CampaignType,
  metric: TargetingMetric,
  slabs: TargetingSlabInput[]
): Promise<PricingBreakdown> {
  const activeSlabs = await prisma.pricingSlab.findMany({
    where: { campaignType, metric, active: true },
  });

  let subtotal = 0;
  let platformFee = 0;
  const lineItems: Array<Record<string, unknown>> = [];

  for (const requested of slabs) {
    const match = activeSlabs.find(
      (s) => s.minValue === requested.minValue && (s.maxValue ?? null) === requested.maxValue
    );
    if (!match) {
      throw new ValidationError(
        `No active pricing slab found for range ${requested.minValue}-${requested.maxValue ?? "∞"}. Pricing may have changed — please refresh.`
      );
    }
    // The brand cannot set an arbitrary payout below the platform's floor.
    const payoutAmount = Math.max(requested.payoutAmount, Number(match.payoutAmount));
    const lineSubtotal = payoutAmount * requested.quantity;
    const lineFee = Number(match.feeAmount) * requested.quantity;

    subtotal += lineSubtotal;
    platformFee += lineFee;
    lineItems.push({
      slabId: match.id,
      minValue: requested.minValue,
      maxValue: requested.maxValue,
      quantity: requested.quantity,
      payoutAmount,
      feeAmount: Number(match.feeAmount),
    });
  }

  const taxRules = await prisma.taxRule.findMany({
    where: { transactionType: "PLATFORM_FEE", applicableParty: "BRAND", active: true },
  });
  let taxAmount = 0;
  const taxLineItems: Array<Record<string, unknown>> = [];
  for (const rule of taxRules) {
    const amount = (platformFee * Number(rule.rate)) / 100;
    taxAmount += amount;
    taxLineItems.push({ taxType: rule.taxType, rate: Number(rule.rate), amount });
  }

  const totalAmount = subtotal + platformFee + taxAmount;

  return {
    subtotal: round2(subtotal),
    platformFee: round2(platformFee),
    taxAmount: round2(taxAmount),
    totalAmount: round2(totalAmount),
    snapshot: { lineItems, taxLineItems, computedAt: new Date().toISOString() },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
