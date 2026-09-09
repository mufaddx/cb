import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  price: z.number().positive().optional(),
  variants: z.record(z.unknown()).optional(),
  inventory: z.number().int().min(0).default(0),
  shippingInfo: z.record(z.unknown()).optional(),
  category: z.string().optional(),
  productUrl: z.string().url().optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
