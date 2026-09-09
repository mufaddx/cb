import { z } from "zod";

export const MIN_WITHDRAWAL_AMOUNT = 100; // ₹100 — placeholder until admin-configurable
// "Withdrawal Rules" (spec §47) exist.

export const RequestWithdrawalSchema = z.object({
  amount: z.number().positive(),
  upiId: z
    .string()
    .regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID (e.g. name@bank)"),
});

export const MarkPaidSchema = z.object({
  referenceNumber: z.string().min(3, "A payment reference number is required as evidence"),
  proofKey: z.string().optional(),
});

export const MarkFailedSchema = z.object({
  reason: z.string().min(3),
});
