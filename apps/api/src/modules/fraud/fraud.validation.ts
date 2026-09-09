import { z } from "zod";

export const CreateFlagSchema = z.object({
  entityType: z.enum(["USER", "CREATOR", "BRAND", "CAMPAIGN", "PAYMENT"]),
  entityId: z.string().min(1),
  flagType: z.string().min(2),
  riskScore: z.number().min(0).max(100),
  evidence: z.record(z.unknown()).optional(),
});

export const ReviewFlagSchema = z.object({
  decision: z.enum(["CLEARED", "RESTRICTED"]),
  notes: z.string().optional(),
});
