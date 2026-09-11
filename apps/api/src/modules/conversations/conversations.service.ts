import { PrismaClient, SenderType } from "@prisma/client";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";

/**
 * Direct messaging between a brand and a creator — deliberately
 * separate from Message (the per-campaign "Deal Room" in
 * modules/messages, which only exists once an offer/assignment does).
 * This is meant to start BEFORE any deal exists, e.g. a brand
 * messaging a creator straight from the Top Creators page.
 */

async function assertParty(prisma: PrismaClient, conversationId: string, brandId?: string, creatorId?: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new NotFoundError("Conversation not found");
  if (brandId && conversation.brandId === brandId) return conversation;
  if (creatorId && conversation.creatorId === creatorId) return conversation;
  throw new UnauthorizedError();
}

/** Get-or-create — starting a conversation with the same creator twice
 * just reopens the existing thread instead of creating a duplicate. */
export async function startConversation(prisma: PrismaClient, brandId: string, creatorId: string) {
  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  if (!creator) throw new NotFoundError("Creator not found");

  const existing = await prisma.conversation.findUnique({ where: { brandId_creatorId: { brandId, creatorId } } });
  if (existing) return existing;

  return prisma.conversation.create({ data: { brandId, creatorId } });
}

export async function listMyConversations(prisma: PrismaClient, brandId?: string, creatorId?: string) {
  const conversations = await prisma.conversation.findMany({
    where: brandId ? { brandId } : { creatorId },
    include: {
      brand: { select: { companyName: true } },
      creator: { select: { displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  // A brand only ever sees the creator's real name here if it has
  // already unlocked that creator elsewhere — starting a chat doesn't
  // itself reveal identity, spending a credit does.
  if (brandId) {
    const unlocks = await prisma.profileUnlock.findMany({ where: { brandId }, select: { creatorId: true } });
    const unlockedIds = new Set(unlocks.map((u) => u.creatorId));
    return conversations.map((c) => ({
      ...c,
      creator: { displayName: unlockedIds.has(c.creatorId) ? c.creator.displayName : `Creator #${c.creatorId.slice(-5).toUpperCase()}` },
    }));
  }
  return conversations;
}

export async function listMessages(prisma: PrismaClient, conversationId: string, brandId?: string, creatorId?: string) {
  await assertParty(prisma, conversationId, brandId, creatorId);
  return prisma.directMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
}

export async function sendMessage(
  prisma: PrismaClient,
  conversationId: string,
  body: string,
  brandId?: string,
  creatorId?: string
) {
  if (!body.trim()) throw new ValidationError("Message can't be empty");
  await assertParty(prisma, conversationId, brandId, creatorId);
  return prisma.directMessage.create({
    data: { conversationId, senderType: brandId ? SenderType.BRAND : SenderType.CREATOR, body: body.trim() },
  });
}
