import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import * as messagesService from "./messages.service";

const router = Router();
router.use(requireAuth);

const SendMessageSchema = z.object({
  body: z.string().max(4000).default(""),
  attachmentKey: z.string().optional(),
});

router.get(
  "/:campaignId",
  requirePermission(Permission.MESSAGE_READ_OWN),
  asyncHandler(async (req, res) => {
    const messages = await messagesService.listMessages(prisma, req.params.campaignId, req.auth!.brandId, req.auth!.creatorId);
    sendSuccess(res, messages);
  })
);

// Admin's read-only view of the same thread — see
// listMessagesForAdmin's comment for why "_OWN" doesn't apply here.
router.get(
  "/:campaignId/admin",
  requirePermission(Permission.CAMPAIGN_REVIEW),
  asyncHandler(async (req, res) => {
    const messages = await messagesService.listMessagesForAdmin(prisma, req.params.campaignId);
    sendSuccess(res, messages);
  })
);

router.post(
  "/:campaignId",
  requirePermission(Permission.MESSAGE_READ_OWN),
  asyncHandler(async (req, res) => {
    const { body, attachmentKey } = SendMessageSchema.parse(req.body);
    const senderType = req.auth!.brandId ? "BRAND" : "CREATOR";
    const message = await messagesService.sendMessage(
      prisma,
      req.params.campaignId,
      req.auth!.sub,
      senderType,
      body,
      attachmentKey,
      req.auth!.brandId,
      req.auth!.creatorId
    );
    sendSuccess(res, message, "Message sent.", 201);
  })
);

export default router;
