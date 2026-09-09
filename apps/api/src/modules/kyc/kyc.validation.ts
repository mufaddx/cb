import { z } from "zod";

export const SubmitKycSchema = z.object({
  documentType: z.enum(["AADHAAR", "PAN", "PASSPORT", "VOTER_ID", "DRIVING_LICENSE"]),
  documentNumber: z.string().min(4).max(64),
  documentKey: z.string().min(1), // from POST /api/uploads?purpose=kyc-document
});
export type SubmitKycInput = z.infer<typeof SubmitKycSchema>;

export const DecideKycSchema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED", "RESUBMISSION_REQUIRED"]),
  reason: z.string().optional(),
});
