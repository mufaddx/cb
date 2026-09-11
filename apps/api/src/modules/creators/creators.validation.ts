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

/** Every field a creator can edit after their profile already exists —
 * same shape as creation, minus fullName/displayName/phone (identity
 * fields, not exposed for self-edit here) and all optional so a
 * partial save (e.g. "just categories") doesn't require resending
 * everything else. */
export const UpdateCreatorSchema = z.object({
  bio: z.string().max(1000).optional(),
  location: z.string().max(120).optional(),
  languages: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  contentFormats: z.array(z.string()).optional(),
});
export type UpdateCreatorInput = z.infer<typeof UpdateCreatorSchema>;
