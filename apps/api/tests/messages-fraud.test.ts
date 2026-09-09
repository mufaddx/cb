import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CampaignStatus, CampaignType, PrismaClient, TargetingMetric } from "@prisma/client";
import { listMessages, postSystemMessage, sendMessage } from "../src/modules/messages/messages.service";
import { listFlagQueue, raiseFlag, reviewFlag } from "../src/modules/fraud/fraud.service";

const prisma = new PrismaClient();

async function makeCampaign() {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });
  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Messages test campaign",
      description: "For Deal Room tests",
      status: CampaignStatus.IN_PROGRESS,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
    },
  });
  return { brand, campaign };
}

describe("Deal Room messaging (spec §40)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("a brand can send and read messages on its own campaign", async () => {
    const { brand, campaign } = await makeCampaign();
    await sendMessage(prisma, campaign.id, brand.id, "BRAND", "Looking forward to this campaign!", undefined, brand.id, undefined);

    const messages = await listMessages(prisma, campaign.id, brand.id, undefined);
    expect(messages).toHaveLength(1);
    expect(messages[0].senderType).toBe("BRAND");
  });

  it("system messages appear in the same thread as human messages", async () => {
    const { brand, campaign } = await makeCampaign();
    await postSystemMessage(prisma, campaign.id, "Creator accepted the campaign.");
    await sendMessage(prisma, campaign.id, brand.id, "BRAND", "Great!", undefined, brand.id, undefined);

    const messages = await listMessages(prisma, campaign.id, brand.id, undefined);
    expect(messages).toHaveLength(2);
    expect(messages[0].senderType).toBe("SYSTEM");
    expect(messages[1].senderType).toBe("BRAND");
  });

  it("a brand cannot read another brand's campaign messages", async () => {
    const { campaign } = await makeCampaign();
    const otherUser = await prisma.user.create({ data: { email: `other-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" } });
    const otherBrand = await prisma.brand.create({ data: { userId: otherUser.id, companyName: "Other", contactPerson: "Bob" } });

    await expect(listMessages(prisma, campaign.id, otherBrand.id, undefined)).rejects.toThrow();
  });

  it("rejects an empty message with no attachment", async () => {
    const { brand, campaign } = await makeCampaign();
    await expect(sendMessage(prisma, campaign.id, brand.id, "BRAND", "", undefined, brand.id, undefined)).rejects.toThrow(
      /text or an attachment/
    );
  });
});

describe("fraud flags (spec §54) — never auto-act", () => {
  it("raising a flag never changes the entity; only an explicit review does", async () => {
    const creatorUser = await prisma.user.create({ data: { email: `creator-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" } });
    const creator = await prisma.creator.create({ data: { userId: creatorUser.id, fullName: "T", displayName: "t" } });

    const flag = await raiseFlag(
      prisma,
      { entityType: "CREATOR", entityId: creator.id, flagType: "DUPLICATE_ACCOUNT", riskScore: 85 },
      "admin-1"
    );
    expect(flag.status).toBe("OPEN");

    const unchanged = await prisma.creator.findUniqueOrThrow({ where: { id: creator.id } });
    expect(unchanged.availability).toBe("AVAILABLE"); // raising alone never restricts

    const queue = await listFlagQueue(prisma);
    expect(queue.some((f) => f.id === flag.id)).toBe(true);

    await reviewFlag(prisma, flag.id, "admin-1", "RESTRICTED", "Confirmed duplicate via KYC documents");
    const restricted = await prisma.creator.findUniqueOrThrow({ where: { id: creator.id } });
    expect(restricted.availability).toBe("PAUSED");

    const queueAfter = await listFlagQueue(prisma);
    expect(queueAfter.some((f) => f.id === flag.id)).toBe(false); // resolved, no longer OPEN
  });

  it("clearing a flag never touches the entity", async () => {
    const creatorUser = await prisma.user.create({ data: { email: `creator-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" } });
    const creator = await prisma.creator.create({ data: { userId: creatorUser.id, fullName: "T", displayName: "t" } });
    const flag = await raiseFlag(prisma, { entityType: "CREATOR", entityId: creator.id, flagType: "SUSPICIOUS_DEVICE", riskScore: 40 }, null);

    await reviewFlag(prisma, flag.id, "admin-1", "CLEARED");
    const unchanged = await prisma.creator.findUniqueOrThrow({ where: { id: creator.id } });
    expect(unchanged.availability).toBe("AVAILABLE");
  });
});
