import { Router } from "express";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import * as conversationsService from "./conversations.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const conversations = await conversationsService.listMyConversations(prisma, req.auth!.brandId, req.auth!.creatorId);
    sendSuccess(res, conversations);
  })
);

const StartSchema = z.object({ creatorId: z.string() });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth?.brandId) throw new UnauthorizedError("Only a brand can start a conversation.");
    const { creatorId } = StartSchema.parse(req.body);
    const conversation = await conversationsService.startConversation(prisma, req.auth.brandId, creatorId);
    sendSuccess(res, conversation, "Conversation ready.", 201);
  })
);

router.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const messages = await conversationsService.listMessages(prisma, req.params.id, req.auth!.brandId, req.auth!.creatorId);
    sendSuccess(res, messages);
  })
);

const SendSchema = z.object({ body: z.string().max(4000) });

router.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const { body } = SendSchema.parse(req.body);
    const message = await conversationsService.sendMessage(prisma, req.params.id, body, req.auth!.brandId, req.auth!.creatorId);
    sendSuccess(res, message, "Message sent.", 201);
  })
);

export default router;
