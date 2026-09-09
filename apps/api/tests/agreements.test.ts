import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AvailabilityStatus, CampaignStatus, CampaignType, InstagramStatus, PrismaClient, TargetingMetric } from "@prisma/client";
import { acceptOffer } from "../src/modules/offers/offers.service";
import { generateAgreementForAssignment, getAgreementForAssignment, regenerateAgreement } from "../src/modules/agreements/agreements.service";

const prisma = new PrismaClient();

async function makeLiveCampaignWithOffer() {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });

  const creatorUser = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const creator = await prisma.creator.create({
    data: { userId: creatorUser.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE },
  });
  const account = await prisma.instagramAccount.create({
    data: { creatorId: creator.id, igUserId: `ig_${creator.id}`, username: "tc", accessTokenEncrypted: "x", status: InstagramStatus.CONNECTED },
  });
  await prisma.instagramMetricSnapshot.create({ data: { instagramAccountId: account.id, followers: 25_000 } });

  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Agreement test campaign",
      description: "For agreement generation tests",
      status: CampaignStatus.LIVE,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      retentionDays: 30,
    },
  });
  const offer = await prisma.campaignOffer.create({
    data: { campaignId: campaign.id, creatorId: creator.id, payoutAmount: 800, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });

  return { brand, creator, campaign, offer, creatorUser };
}

describe("agreements (spec §36) — generated on offer acceptance", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("accepting an offer generates a real PDF, an Agreement row, an AgreementAcceptance, and a Document row", async () => {
    const { offer, creator, creatorUser } = await makeLiveCampaignWithOffer();

    const assignment = await acceptOffer(prisma, offer.id, creator.id, {
      termsAccepted: true,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    const agreement = await prisma.agreement.findUnique({ where: { assignmentId: assignment.id } });
    expect(agreement).not.toBeNull();
    expect(agreement!.documentKey).toBe(`agreements/${assignment.id}.pdf`);
    expect(agreement!.documentHash).toHaveLength(64); // sha256 hex

    const acceptance = await prisma.agreementAcceptance.findFirst({ where: { agreementId: agreement!.id } });
    expect(acceptance).not.toBeNull();
    expect(acceptance!.userId).toBe(creatorUser.id);
    expect(acceptance!.ipAddress).toBe("127.0.0.1");
    expect(acceptance!.documentHash).toBe(agreement!.documentHash);

    const document = await prisma.document.findFirst({ where: { assignmentId: assignment.id, type: "AGREEMENT" } });
    expect(document).not.toBeNull();
    expect(document!.objectKey).toBe(agreement!.documentKey);

    // The PDF is a real file, not a stub — fetch it back via the
    // storage provider's own signed-URL contract and check it starts
    // with the PDF magic bytes.
    const { getStorageProvider, LocalStorageProvider } = await import("../src/services/storage");
    const provider = getStorageProvider() as InstanceType<typeof LocalStorageProvider>;
    const fs = await import("fs");
    const bytes = fs.readFileSync(provider.resolvePath(agreement!.documentKey));
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("rejects accepting without confirming terms", async () => {
    const { offer, creator } = await makeLiveCampaignWithOffer();
    await expect(
      acceptOffer(prisma, offer.id, creator.id, { termsAccepted: false as unknown as true })
    ).rejects.toThrow(/confirm acceptance/);
  });

  it("getAgreementForAssignment enforces ownership and returns a signed download URL", async () => {
    const { offer, creator, brand } = await makeLiveCampaignWithOffer();
    const assignment = await acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true });

    const forCreator = await getAgreementForAssignment(prisma, assignment.id, undefined, creator.id);
    expect(forCreator.downloadUrl).toBeTruthy();

    const forBrand = await getAgreementForAssignment(prisma, assignment.id, brand.id, undefined);
    expect(forBrand.downloadUrl).toBeTruthy();

    const otherUser = await prisma.user.create({ data: { email: `other-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" } });
    const otherBrand = await prisma.brand.create({ data: { userId: otherUser.id, companyName: "Other", contactPerson: "Bob" } });
    await expect(getAgreementForAssignment(prisma, assignment.id, otherBrand.id, undefined)).rejects.toThrow();
  });

  it("regenerateAgreement refuses to duplicate an existing agreement", async () => {
    const { offer, creator } = await makeLiveCampaignWithOffer();
    const assignment = await acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true });

    await expect(regenerateAgreement(prisma, assignment.id)).rejects.toThrow(/already exists/);
  });

  it("generateAgreementForAssignment is idempotent — calling it twice returns the same row", async () => {
    const { offer, creator } = await makeLiveCampaignWithOffer();
    const assignment = await acceptOffer(prisma, offer.id, creator.id, { termsAccepted: true });

    const again = await generateAgreementForAssignment(prisma, assignment.id);
    const all = await prisma.agreement.findMany({ where: { assignmentId: assignment.id } });
    expect(all).toHaveLength(1);
    expect(again.id).toBe(all[0].id);
  });
});
