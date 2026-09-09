import { z } from "zod";

export const SubmitContentSchema = z.object({
  fileKey: z.string().min(1), // from POST /api/uploads?purpose=post-screenshot (or a dedicated content-video purpose later)
});

export const ReviewContentSchema = z.object({
  decision: z.enum(["APPROVE", "REVISION", "REJECT"]),
  feedback: z.string().optional(),
  deadline: z.string().datetime().optional(),
  override: z.boolean().default(false), // admin-only bypass of the revision limit
});

export const DEFAULT_REVISION_LIMIT = 2;
