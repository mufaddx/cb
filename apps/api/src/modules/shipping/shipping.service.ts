import { AssignmentStatus as PrismaAssignmentStatus, CampaignType, PrismaClient, ShipmentStatus as PrismaShipmentStatus } from "@prisma/client";
import { AssignmentStatus, ASSIGNMENT_TRANSITIONS, AuditAction, SHIPMENT_TRANSITIONS, ShipmentStatus, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { postSystemMessage } from "../messages/messages.service";
import type { CreateShipmentInput, SubmitAddressInput } from "./shipping.validation";

async function loadAssignmentForProductReview(prisma: PrismaClient, assignmentId: string) {
  const assignment = await prisma.campaignAssignment.findUnique({
    where: { id: assignmentId },
    include: { campaign: true, shipment: true, shippingAddress: true },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");
  if (assignment.campaign.type !== CampaignType.PRODUCT_REVIEW) {
    throw new ValidationError("This action is only available for Product Review campaigns");
  }
  if (!assignment.shipment) throw new ConflictError("This assignment has no shipment record");
  return assignment;
}

/** Creator submits their shipping address (spec §27). */
export async function submitShippingAddress(
  prisma: PrismaClient,
  assignmentId: string,
  creatorId: string,
  input: SubmitAddressInput
) {
  const assignment = await loadAssignmentForProductReview(prisma, assignmentId);
  if (assignment.creatorId !== creatorId) throw new UnauthorizedError();
  if (assignment.shippingAddress) throw new ConflictError("A shipping address has already been submitted");

  assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.ADDRESS_PENDING, ShipmentStatus.ADDRESS_SUBMITTED);

  return prisma.$transaction(async (tx) => {
    const address = await tx.shippingAddress.create({ data: { creatorId, assignmentId, ...input } });
    await tx.shipment.update({
      where: { assignmentId },
      data: { status: PrismaShipmentStatus.ADDRESS_SUBMITTED },
    });
    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.ADDRESS_SUBMITTED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
    });
    await tx.notification.create({
      data: {
        userId: (await tx.brand.findUniqueOrThrow({ where: { id: assignment.campaign.brandId } })).userId,
        type: "ADDRESS_SUBMITTED",
        title: "Shipping address submitted",
        body: "A creator has submitted their shipping details for your Product Review campaign.",
        campaignId: assignment.campaignId,
      },
    });
    await postSystemMessage(tx, assignment.campaignId, "Shipping address submitted.");
    return address;
  });
}

/**
 * Brand marks the product as shipped (spec §29). One action covers
 * the READY_TO_SHIP -> SHIPPED hop — there's no separate "mark ready"
 * UI step in the spec, so both transitions happen together here.
 */
export async function createShipment(
  prisma: PrismaClient,
  assignmentId: string,
  brandId: string,
  input: CreateShipmentInput
) {
  const assignment = await loadAssignmentForProductReview(prisma, assignmentId);
  if (assignment.campaign.brandId !== brandId) throw new UnauthorizedError();
  if (assignment.shipment!.status !== PrismaShipmentStatus.ADDRESS_SUBMITTED) {
    throw new ConflictError(`Shipment cannot be created from status ${assignment.shipment!.status}`);
  }

  return prisma.$transaction(async (tx) => {
    assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.ADDRESS_SUBMITTED, ShipmentStatus.READY_TO_SHIP);
    assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.READY_TO_SHIP, ShipmentStatus.SHIPPED);

    const shipment = await tx.shipment.update({
      where: { assignmentId },
      data: {
        status: PrismaShipmentStatus.SHIPPED,
        courier: input.courier,
        trackingNumber: input.trackingNumber,
        shippedAt: new Date(),
        expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : undefined,
      },
    });

    await recordAudit(tx, {
      actorId: brandId,
      actorRole: "BRAND",
      action: AuditAction.SHIPMENT_SHIPPED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
      newValue: { courier: input.courier, trackingNumber: input.trackingNumber },
    });

    const creator = await tx.creator.findUniqueOrThrow({ where: { id: assignment.creatorId } });
    await tx.notification.create({
      data: {
        userId: creator.userId,
        type: "SHIPMENT_SHIPPED",
        title: "Your product has shipped",
        body: `Tracking: ${input.courier} ${input.trackingNumber}`,
        campaignId: assignment.campaignId,
      },
    });
    await postSystemMessage(tx, assignment.campaignId, `Shipment created: ${input.courier} ${input.trackingNumber}.`);

    return shipment;
  });
}

export async function reportDeliveryIssue(prisma: PrismaClient, assignmentId: string, brandId: string, notes: string) {
  const assignment = await loadAssignmentForProductReview(prisma, assignmentId);
  if (assignment.campaign.brandId !== brandId) throw new UnauthorizedError();

  assertTransition(
    "Shipment",
    SHIPMENT_TRANSITIONS,
    assignment.shipment!.status as ShipmentStatus,
    ShipmentStatus.DELIVERY_FAILED
  );
  return prisma.shipment.update({
    where: { assignmentId },
    data: { status: PrismaShipmentStatus.DELIVERY_FAILED, issueNotes: notes },
  });
}

/**
 * Creator confirms receipt (spec §30). No courier tracking API is
 * integrated in this build, so there's no automated IN_TRANSIT /
 * DELIVERED update — this action hops the shipment straight from
 * wherever it is (SHIPPED or DELIVERY_FAILED-then-reshipped) through
 * to RECEIVED in one step, since the creator physically having the
 * product is the strongest possible confirmation of delivery.
 */
export async function confirmReceipt(prisma: PrismaClient, assignmentId: string, creatorId: string, proofKey?: string) {
  const assignment = await loadAssignmentForProductReview(prisma, assignmentId);
  if (assignment.creatorId !== creatorId) throw new UnauthorizedError();

  const currentStatus = assignment.shipment!.status as ShipmentStatus;
  if (currentStatus !== ShipmentStatus.SHIPPED && currentStatus !== ShipmentStatus.IN_TRANSIT && currentStatus !== ShipmentStatus.DELIVERED) {
    throw new ConflictError(`Cannot confirm receipt from shipment status ${currentStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    if (currentStatus === ShipmentStatus.SHIPPED) {
      assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT);
      assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED);
    } else if (currentStatus === ShipmentStatus.IN_TRANSIT) {
      assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED);
    }
    assertTransition("Shipment", SHIPMENT_TRANSITIONS, ShipmentStatus.DELIVERED, ShipmentStatus.RECEIVED);

    const shipment = await tx.shipment.update({
      where: { assignmentId },
      data: { status: PrismaShipmentStatus.RECEIVED, receivedAt: new Date(), receiptProofKey: proofKey },
    });

    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.PRODUCT_RECEIVED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
    });

    // Receiving the product unlocks content creation (spec §30).
    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.ACCEPTED, AssignmentStatus.POST_PENDING);
    await tx.campaignAssignment.update({
      where: { id: assignmentId },
      data: { status: PrismaAssignmentStatus.POST_PENDING },
    });

    return shipment;
  });
}
