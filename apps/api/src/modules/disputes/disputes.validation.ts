import { z } from "zod";

export const OpenDisputeSchema = z.object({
  type: z.string().min(2),
  reason: z.string().min(3),
  description: z.string().min(10),
});

export const DecideDisputeSchema = z.object({
  decision: z.string().min(5),
});
