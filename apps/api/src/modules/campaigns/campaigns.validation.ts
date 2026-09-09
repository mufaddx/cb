import { z } from "zod";
import { CampaignType, TargetingMetric } from "@antigravity/shared";

const TargetingSlabSchema = z.object({
  minValue: z.number().int().nonnegative(),
  maxValue: z.number().int().positive().nullable(),
  payoutAmount: z.number().positive(),
  quantity: z.number().int().positive(),
});

export const CreateCampaignSchema = z
  .object({
    type: z.nativeEnum(CampaignType),
    title: z.string().min(3).max(150),
    description: z.string().min(10),
    objective: z.string().optional(),
    categoryId: z.string().optional(),
    subcategory: z.string().optional(),
    language: z.string().optional(),
    targetingMetric: z.nativeEnum(TargetingMetric),
    targetingSlabs: z.array(TargetingSlabSchema).min(1),
    retentionDays: z.number().int().min(0).max(365).default(30),
    disclosureRequired: z.boolean().default(true),
    restrictedCategory: z.string().nullable().optional(),
    briefJson: z.record(z.unknown()).optional(),
    /** Required for PRODUCT_REVIEW — must be one of the brand's own
     * (non-archived) products. Ignored for other campaign types. */
    productId: z.string().optional(),
  })
  .refine((data) => data.type !== CampaignType.PRODUCT_REVIEW || Boolean(data.productId), {
    message: "productId is required for Product Review campaigns",
    path: ["productId"],
  });
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const RejectCampaignSchema = z.object({
  reason: z.string().min(5, "A rejection reason is required"),
});
