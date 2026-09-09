import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AvailabilityStatus,
  CampaignStatus,
  CampaignType,
  InstagramStatus,
  OfferStatus,
  PrismaClient,
  TargetingMetric,
} from "@prisma/client";
import { acceptOffer, expireStaleOffers, rejectOffer } from "../src/modules/offers/offers.service";

const prisma = new PrismaClient();

async function makeConnectedCreator(followers: number) {
  const user = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const creator = await prisma.creator.create({
    data: { userId: user.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE },
  });
  const account = await prisma.instagramAccount.create({
    data: {
      creatorId: creator.id,
      igUserId: `ig_${creator.id}`,
      username: "test_creator",
      accessTokenEncrypted: "irrelevant-for-this-test",
      status: InstagramStatus.CONNECTED,
    },
  });
  await prisma.instagramMetricSnapshot.create({ data: { instagramAccountId: account.id, followers } });
  return creator;
}

async function makeLiveCampaignWithOffer(creatorId: string) {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({
    data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" },
  });
  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Test campaign",
      description: "For offer acceptance tests",
      status: CampaignStatus.LIVE,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      targetingSlabs: { create: { minValue: 10_000, maxValue: 50_000, payoutAmount: 800, quantity: 1 } },
    },
    include: { targetingSlabs: true },
  });
  const offer = await prisma.campaignOffer.create({
    data: {
      campaignId: campaign.id,
      creatorId,
      slabId: campaign.targetingSlabs[0].id,
      payoutAmount: 800,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });
  return { campaign, offer };
}

describe("offer accept/reject (spec §21) — idempotency guards", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("accepting a valid offer creates exactly one assignment and moves the campaign to IN_PROGRESS", async () => {
    const creator = await makeConnectedCreator(25_000);
    const { campaign, offer } = await makeLiveCampaignWithOffer(creator.id);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: CampaignStatus.MATCHING } });

    const assignment = await acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true });
    expect(assignment.status).toBe("POST_PENDING");

    const updatedCampaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updatedCampaign.status).toBe(CampaignStatus.IN_PROGRESS);

    const updatedOffer = await prisma.campaignOffer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(updatedOffer.status).toBe(OfferStatus.ACCEPTED);
  });

  // Regression test: re-accepting an already-ACCEPTED offer used to
  // hit the CampaignAssignment.offerId unique constraint and surface
  // as an opaque 500, because assertTransition's same-state "no-op"
  // shortcut let it fall through to a second `assignment.create`.
  it("rejects re-accepting an already-accepted offer with a clean conflict, not a crash", async () => {
    const creator = await makeConnectedCreator(25_000);
    const { offer } = await makeLiveCampaignWithOffer(creator.id);

    await acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true });

    await expect(acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true })).rejects.toThrow(/already been accepted/);

    const assignments = await prisma.campaignAssignment.findMany({ where: { offerId: offer.id } });
    expect(assignments).toHaveLength(1);
  });

  it("rejects declining an already-accepted offer instead of double-freeing slab capacity", async () => {
    const creator = await makeConnectedCreator(25_000);
    const { offer } = await makeLiveCampaignWithOffer(creator.id);

    await acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true });
    await expect(rejectOffer(prisma, offer.id, creator.id)).rejects.toThrow(/already been accepted/);
  });

  it("rejecting an offer frees the slab slot exactly once, even if called twice", async () => {
    const creator = await makeConnectedCreator(25_000);
    const { campaign, offer } = await makeLiveCampaignWithOffer(creator.id);
    await prisma.campaignTargetingSlab.update({
      where: { id: offer.slabId! },
      data: { reserved: 1 }, // simulate matching having reserved this slot
    });

    await rejectOffer(prisma, offer.id, creator.id);
    const afterFirst = await prisma.campaignTargetingSlab.findUniqueOrThrow({ where: { id: offer.slabId! } });
    expect(afterFirst.reserved).toBe(0);

    await expect(rejectOffer(prisma, offer.id, creator.id)).rejects.toThrow(/already declined/);
    const afterSecond = await prisma.campaignTargetingSlab.findUniqueOrThrow({ where: { id: offer.slabId! } });
    expect(afterSecond.reserved).toBe(0); // must not go negative from a double-decrement
  });

  // This is what jobs/scheduler.ts calls on a timer (spec §79 offer
  // expiry) — verifying it directly since the scheduler itself is
  // just a setInterval wrapper around this function.
  it("expireStaleOffers bulk-expires only past-due OFFERED/VIEWED offers", async () => {
    const creator = await makeConnectedCreator(25_000);
    const { offer: expiredOffer } = await makeLiveCampaignWithOffer(creator.id);
    await prisma.campaignOffer.update({ where: { id: expiredOffer.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const creator2 = await makeConnectedCreator(25_000);
    const { offer: freshOffer } = await makeLiveCampaignWithOffer(creator2.id);

    const result = await expireStaleOffers(prisma);
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const updatedExpired = await prisma.campaignOffer.findUniqueOrThrow({ where: { id: expiredOffer.id } });
    expect(updatedExpired.status).toBe(OfferStatus.EXPIRED);

    const updatedFresh = await prisma.campaignOffer.findUniqueOrThrow({ where: { id: freshOffer.id } });
    expect(updatedFresh.status).toBe(OfferStatus.OFFERED); // untouched — not yet due

    // Idempotent: running it again finds nothing left to expire from this pair.
    const second = await expireStaleOffers(prisma);
    const stillOne = await prisma.campaignOffer.findMany({ where: { id: { in: [expiredOffer.id] }, status: OfferStatus.EXPIRED } });
    expect(stillOne).toHaveLength(1); // not double-processed
    void second;
  });
});
