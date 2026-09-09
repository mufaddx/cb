import { Prisma, PrismaClient, SenderType } from "@prisma/client";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Every campaign has a Deal Room (spec §40). Human messages go through
 * `sendMessage`; system messages are posted automatically at lifecycle
 * events by calling `postSystemMessage` from the service that owns
 * that event (offers, shipping, content, retention/payouts) — don't
 * have the frontend synthesize these from other API responses, the
 * whole point is a durable, shared timeline.
 */
export async function postSystemMessage(db: DbClient, campaignId: string, body: string) {
  return db.message.create({ data: { campaignId, senderType: SenderType.SYSTEM, body } });
}

async function assertCampaignParty(prisma: PrismaClient, campaignId: string, brandId?: string, creatorId?: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError("Campaign not found");

  if (brandId) {
    if (campaign.brandId !== brandId) throw new UnauthorizedError();
    return campaign;
  }
  if (creatorId) {
    const assignment = await prisma.campaignAssignment.findFirst({ where: { campaignId, creatorId } });
    const offer = assignment ? null : await prisma.campaignOffer.findFirst({ where: { campaignId, creatorId } });
    if (!assignment && !offer) throw new UnauthorizedError("You have no offer or assignment on this campaign");
    return campaign;
  }
  throw new UnauthorizedError();
}

export async function sendMessage(
  prisma: PrismaClient,
  campaignId: string,
  senderId: string,
  senderType: "BRAND" | "CREATOR",
  body: string,
  attachmentKey?: string,
  brandId?: string,
  creatorId?: string
) {
  if (!body.trim() && !attachmentKey) throw new ValidationError("Message must have text or an attachment");
  await assertCampaignParty(prisma, campaignId, brandId, creatorId);

  return prisma.message.create({
    data: { campaignId, senderId, senderType: senderType as SenderType, body, attachmentKey },
  });
}

export async function listMessages(prisma: PrismaClient, campaignId: string, brandId?: string, creatorId?: string) {
  await assertCampaignParty(prisma, campaignId, brandId, creatorId);
  return prisma.message.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } });
}
