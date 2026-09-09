import { z } from "zod";

export const CreateCreatorSchema = z.object({
  fullName: z.string().min(2),
  displayName: z.string().min(2),
  phone: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  languages: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  contentFormats: z.array(z.string()).default([]),
  campaignPreferences: z.array(z.string()).default([]), // CLIPPING | CREATOR_CONTENT | PRODUCT_REVIEW
});
export type CreateCreatorInput = z.infer<typeof CreateCreatorSchema>;
