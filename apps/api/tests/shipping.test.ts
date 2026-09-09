import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AssignmentStatus, AvailabilityStatus, CampaignStatus, CampaignType, PrismaClient, ShipmentStatus, TargetingMetric } from "@prisma/client";
import { confirmReceipt, createShipment, submitShippingAddress } from "../src/modules/shipping/shipping.service";

const prisma = new PrismaClient();

async function makeProductReviewAssignment() {
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

  const product = await prisma.product.create({ data: { brandId: brand.id, name: "Test Gadget" } });

  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.PRODUCT_REVIEW,
      title: "Product review test",
      description: "For shipping tests",
      status: CampaignStatus.IN_PROGRESS,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      products: { create: { productId: product.id } },
    },
  });

  const offer = await prisma.campaignOffer.create({
    data: { campaignId: campaign.id, creatorId: creator.id, payoutAmount: 500, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });
  const assignment = await prisma.campaignAssignment.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      offerId: offer.id,
      status: AssignmentStatus.ACCEPTED,
      payoutAmount: 500,
      acceptedAt: new Date(),
    },
  });
  await prisma.shipment.create({ data: { assignmentId: assignment.id } });

  return { brand, creator, campaign, assignment };
}

const SAMPLE_ADDRESS = {
  fullName: "Test Creator",
  phone: "9876543210",
  line1: "123 Main St",
  city: "Mumbai",
  state: "Maharashtra",
  pin: "400001",
};

describe("shipping flow for Product Review campaigns (spec §27-30)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("walks address -> ship -> confirm-received and unlocks content creation", async () => {
    const { brand, creator, assignment } = await makeProductReviewAssignment();

    await submitShippingAddress(prisma, assignment.id, creator.id, SAMPLE_ADDRESS);
    let shipment = await prisma.shipment.findUniqueOrThrow({ where: { assignmentId: assignment.id } });
    expect(shipment.status).toBe(ShipmentStatus.ADDRESS_SUBMITTED);

    await createShipment(prisma, assignment.id, brand.id, { courier: "BlueDart", trackingNumber: "BD12345" });
    shipment = await prisma.shipment.findUniqueOrThrow({ where: { assignmentId: assignment.id } });
    expect(shipment.status).toBe(ShipmentStatus.SHIPPED);
    expect(shipment.trackingNumber).toBe("BD12345");

    await confirmReceipt(prisma, assignment.id, creator.id);
    shipment = await prisma.shipment.findUniqueOrThrow({ where: { assignmentId: assignment.id } });
    expect(shipment.status).toBe(ShipmentStatus.RECEIVED);

    const updatedAssignment = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updatedAssignment.status).toBe(AssignmentStatus.POST_PENDING);
  });

  it("rejects submitting a shipment before an address exists", async () => {
    const { brand, assignment } = await makeProductReviewAssignment();
    await expect(
      createShipment(prisma, assignment.id, brand.id, { courier: "BlueDart", trackingNumber: "X" })
    ).rejects.toThrow(/cannot be created from status/);
  });

  it("rejects a second address submission for the same assignment", async () => {
    const { creator, assignment } = await makeProductReviewAssignment();
    await submitShippingAddress(prisma, assignment.id, creator.id, SAMPLE_ADDRESS);
    await expect(submitShippingAddress(prisma, assignment.id, creator.id, SAMPLE_ADDRESS)).rejects.toThrow(/already been submitted/);
  });

  it("rejects confirming receipt before anything has shipped", async () => {
    const { creator, assignment } = await makeProductReviewAssignment();
    await expect(confirmReceipt(prisma, assignment.id, creator.id)).rejects.toThrow(/Cannot confirm receipt/);
  });

  it("a brand cannot create a shipment on another brand's assignment", async () => {
    const { creator, assignment } = await makeProductReviewAssignment();
    await submitShippingAddress(prisma, assignment.id, creator.id, SAMPLE_ADDRESS);

    const otherBrandUser = await prisma.user.create({
      data: { email: `other-brand-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
    });
    const otherBrand = await prisma.brand.create({ data: { userId: otherBrandUser.id, companyName: "Other Brand", contactPerson: "Bob" } });

    await expect(
      createShipment(prisma, assignment.id, otherBrand.id, { courier: "BlueDart", trackingNumber: "X" })
    ).rejects.toThrow();
  });
});
