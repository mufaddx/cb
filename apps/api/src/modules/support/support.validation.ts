import { z } from "zod";

export const CreateTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
});
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

export const AddMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type AddMessageInput = z.infer<typeof AddMessageSchema>;

export const UpdateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});
export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusSchema>;
