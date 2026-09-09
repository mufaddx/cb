import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CampaignStatus, CampaignType, DisputeStatus, PrismaClient, TargetingMetric } from "@prisma/client";
import { decideDispute, getDisputeForParty, openDispute, requestEvidence } from "../src/modules/disputes/disputes.service";

const prisma = new PrismaClient();

async function makeLiveCampaign() {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });
  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Dispute test campaign",
      description: "For dispute tests",
      status: CampaignStatus.IN_PROGRESS,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
    },
  });
  return { brand, campaign };
}

describe("disputes (spec §86)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("opening a dispute moves the campaign to DISPUTED", async () => {
    const { brand, campaign } = await makeLiveCampaign();

    const dispute = await openDispute(prisma, campaign.id, brand.id, "BRAND", {
      type: "CONTENT_QUALITY",
      reason: "Wrong product shown",
      description: "The creator reviewed the wrong SKU entirely.",
    });
    expect(dispute.status).toBe(DisputeStatus.OPEN);

    const updatedCampaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updatedCampaign.status).toBe(CampaignStatus.DISPUTED);
  });

  it("a second dispute on an already-disputed campaign is a safe no-op on campaign status", async () => {
    const { brand, campaign } = await makeLiveCampaign();
    await openDispute(prisma, campaign.id, brand.id, "BRAND", { type: "A", reason: "r1", description: "first dispute description" });
    const second = await openDispute(prisma, campaign.id, brand.id, "BRAND", { type: "B", reason: "r2", description: "second dispute description" });
    expect(second.status).toBe(DisputeStatus.OPEN);

    const disputes = await prisma.dispute.findMany({ where: { campaignId: campaign.id } });
    expect(disputes).toHaveLength(2);
  });

  it("rejects opening a dispute on a campaign status that doesn't allow it (e.g. DRAFT)", async () => {
    const { brand } = await makeLiveCampaign();
    const draftCampaign = await prisma.campaign.create({
      data: {
        code: `CMP-draft-${Date.now()}`,
        brandId: brand.id,
        type: CampaignType.CLIPPING,
        title: "Draft campaign",
        description: "Still a draft",
        status: CampaignStatus.DRAFT,
        targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      },
    });
    await expect(
      openDispute(prisma, draftCampaign.id, brand.id, "BRAND", { type: "A", reason: "r", description: "cannot dispute a draft" })
    ).rejects.toThrow(/cannot be disputed/);
  });

  it("full lifecycle: open -> request evidence -> decide -> resolved", async () => {
    const { brand, campaign } = await makeLiveCampaign();
    const dispute = await openDispute(prisma, campaign.id, brand.id, "BRAND", {
      type: "A",
      reason: "r",
      description: "needs evidence before deciding",
    });

    const afterEvidence = await requestEvidence(prisma, dispute.id, "admin-1");
    expect(afterEvidence.status).toBe(DisputeStatus.EVIDENCE_REQUESTED);

    const resolved = await decideDispute(prisma, dispute.id, "admin-1", "Refund issued to brand for 50% of campaign value.");
    expect(resolved.status).toBe(DisputeStatus.RESOLVED);
    expect(resolved.decision).toContain("Refund issued");
  });

  it("a brand cannot view another brand's dispute", async () => {
    const { brand, campaign } = await makeLiveCampaign();
    const dispute = await openDispute(prisma, campaign.id, brand.id, "BRAND", { type: "A", reason: "r", description: "belongs to brand 1" });

    const otherUser = await prisma.user.create({ data: { email: `other-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" } });
    const otherBrand = await prisma.brand.create({ data: { userId: otherUser.id, companyName: "Other", contactPerson: "Bob" } });

    await expect(getDisputeForParty(prisma, dispute.id, otherBrand.id, undefined)).rejects.toThrow();
  });

  it("cannot decide an already-resolved dispute", async () => {
    const { brand, campaign } = await makeLiveCampaign();
    const dispute = await openDispute(prisma, campaign.id, brand.id, "BRAND", { type: "A", reason: "r", description: "will be resolved once" });
    await decideDispute(prisma, dispute.id, "admin-1", "First decision.");

    await expect(decideDispute(prisma, dispute.id, "admin-1", "Second decision attempt.")).rejects.toThrow(/cannot be decided from status/);
  });
});
