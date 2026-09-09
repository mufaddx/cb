import { z } from "zod";

export const CreateBrandSchema = z.object({
  companyName: z.string().min(2),
  contactPerson: z.string().min(2),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  billingAddress: z.record(z.unknown()).optional(),
  gstin: z.string().optional(),
  description: z.string().optional(),
  categoryIds: z.array(z.string()).default([]),
});
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
