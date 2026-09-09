import { z } from "zod";

export const RequestRefundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(5),
});
