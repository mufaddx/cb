import { z } from "zod";

export const SubmitAddressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(3),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pin: z.string().min(4).max(10),
});
export type SubmitAddressInput = z.infer<typeof SubmitAddressSchema>;

export const CreateShipmentSchema = z.object({
  courier: z.string().min(2),
  trackingNumber: z.string().min(2),
  expectedDeliveryAt: z.string().datetime().optional(),
});
export type CreateShipmentInput = z.infer<typeof CreateShipmentSchema>;

export const ConfirmReceiptSchema = z.object({
  proofKey: z.string().optional(),
});
