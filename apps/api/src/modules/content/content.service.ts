import { AssignmentStatus as PrismaAssignmentStatus, CampaignType, PrismaClient, SubmissionStatus } from "@prisma/client";
import { AssignmentStatus, ASSIGNMENT_TRANSITIONS, AuditAction, Role, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { markAssignmentFailed, markAssignmentVerified } from "../verification/verification.service";
import { postSystemMessage } from "../messages/messages.service";
import { DEFAULT_REVISION_LIMIT } from "./content.validation";

// Product Review is explicitly "a specialized Creator Content campaign
// involving physical product shipping" (spec §01) — once the product
// is received (see modules/shipping), its review submission reuses
// this exact content-submission + brand/admin review flow rather than
// a third parallel implementation.
const CONTENT_SUBMISSION_TYPES: CampaignType[] = [CampaignType.CREATOR_CONTENT, CampaignType.PRODUCT_REVIEW];

async function loadAssignment(prisma: PrismaClient, assignmentId: string) {
  const assignment = await prisma.campaignAssignment.findUnique({
    where: { id: assignmentId },
    include: { campaign: true, contentSubmissions: { orderBy: { version: "desc" } } },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");
  if (!CONTENT_SUBMISSION_TYPES.includes(assignment.campaign.type)) {
    throw new ValidationError("Content submission is only available for Creator Content and Product Review campaigns");
  }
  return assignment;
}

/** Creator submits (or resubmits after a revision request) content
 * (spec §24). Version increments with every submission on the same
 * assignment, so the full history is visible to the reviewer. */
export async function submitContent(prisma: PrismaClient, assignmentId: string, creatorId: string, fileKey: string) {
  const assignment = await loadAssignment(prisma, assignmentId);
  if (assignment.creatorId !== creatorId) throw new UnauthorizedError();
  if (assignment.status !== PrismaAssignmentStatus.POST_PENDING) {
    throw new ConflictError(`Assignment is not awaiting a content submission (current status: ${assignment.status})`);
  }

  const version = (assignment.contentSubmissions[0]?.version ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    const submission = await tx.contentSubmission.create({
      data: { assignmentId, version, fileKey, status: SubmissionStatus.SUBMITTED },
    });

    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.POST_PENDING, AssignmentStatus.POST_SUBMITTED);
    await tx.campaignAssignment.update({ where: { id: assignmentId }, data: { status: PrismaAssignmentStatus.POST_SUBMITTED } });
    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.POST_SUBMITTED, AssignmentStatus.VERIFICATION);
    await tx.campaignAssignment.update({ where: { id: assignmentId }, data: { status: PrismaAssignmentStatus.VERIFICATION } });

    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.CONTENT_SUBMITTED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
      newValue: { version, fileKey },
    });
    await postSystemMessage(tx, assignment.campaignId, "Content submitted.");

    return submission;
  });
}

export async function listContentReviewQueue(prisma: PrismaClient) {
  return prisma.campaignAssignment.findMany({
    where: { status: PrismaAssignmentStatus.VERIFICATION, campaign: { type: { in: CONTENT_SUBMISSION_TYPES } } },
    include: { campaign: true, creator: true, contentSubmissions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { updatedAt: "asc" },
  });
}

export interface ReviewDecisionInput {
  decision: "APPROVE" | "REVISION" | "REJECT";
  feedback?: string;
  deadline?: string;
  override?: boolean;
}

/**
 * Brand (on its own campaign) or admin reviews the latest submission
 * (spec §25). A revision request past the campaign's configured limit
 * (stored in `campaign.briefJson.revisionLimit`, default
 * DEFAULT_REVISION_LIMIT) is rejected unless `override` is set AND the
 * caller is an admin — a brand can never self-override its own limit.
 */
export async function reviewContent(
  prisma: PrismaClient,
  assignmentId: string,
  reviewerId: string,
  reviewerRoles: Role[],
  input: ReviewDecisionInput,
  callerBrandId?: string
) {
  const assignment = await loadAssignment(prisma, assignmentId);
  const isAdminCaller = reviewerRoles.some((r) => r === Role.OPERATIONS_ADMIN || r === Role.SUPER_ADMIN || r === Role.CONTENT_REVIEWER);
  if (!isAdminCaller && assignment.campaign.brandId !== callerBrandId) {
    throw new UnauthorizedError();
  }
  if (assignment.status !== PrismaAssignmentStatus.VERIFICATION) {
    throw new ConflictError(`Assignment is not awaiting content review (current status: ${assignment.status})`);
  }
  const submission = assignment.contentSubmissions[0];
  if (!submission) throw new ConflictError("No content submission found for this assignment");

  const isAdmin = isAdminCaller;

  if (input.decision === "APPROVE") {
    await prisma.contentSubmission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.APPROVED, reviewedAt: new Date(), reviewedBy: reviewerId },
    });
    await recordAudit(prisma, {
      actorId: reviewerId,
      actorRole: isAdmin ? "OPERATIONS_ADMIN" : "BRAND",
      action: AuditAction.CONTENT_APPROVED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
    });
    await postSystemMessage(prisma, assignment.campaignId, "Content approved.");
    return markAssignmentVerified(prisma, assignmentId, reviewerId, isAdmin ? "OPERATIONS_ADMIN" : "BRAND");
  }

  if (input.decision === "REJECT") {
    await prisma.contentSubmission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.REJECTED, reviewedAt: new Date(), reviewedBy: reviewerId },
    });
    return markAssignmentFailed(prisma, assignmentId, reviewerId, isAdmin ? "OPERATIONS_ADMIN" : "BRAND");
  }

  // REVISION
  const revisionLimit = Number((assignment.campaign.briefJson as any)?.revisionLimit ?? DEFAULT_REVISION_LIMIT);
  const revisionCount = await prisma.contentRevision.count({
    where: { submission: { assignmentId } },
  });
  if (revisionCount >= revisionLimit && !(input.override && isAdmin)) {
    throw new ConflictError(
      `Revision limit (${revisionLimit}) reached for this assignment. An admin can override with override:true.`
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.contentSubmission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.REVISION_REQUESTED, reviewedAt: new Date(), reviewedBy: reviewerId },
    });
    await tx.contentRevision.create({
      data: {
        submissionId: submission.id,
        reason: "REVISION_REQUESTED",
        feedback: input.feedback ?? "",
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        requestedBy: reviewerId,
      },
    });

    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.VERIFICATION, AssignmentStatus.POST_PENDING);
    const updated = await tx.campaignAssignment.update({
      where: { id: assignmentId },
      data: { status: PrismaAssignmentStatus.POST_PENDING },
    });

    await recordAudit(tx, {
      actorId: reviewerId,
      actorRole: isAdmin ? "OPERATIONS_ADMIN" : "BRAND",
      action: AuditAction.REVISION_REQUESTED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
      metadata: { feedback: input.feedback, revisionNumber: revisionCount + 1, revisionLimit },
    });
    await postSystemMessage(tx, assignment.campaignId, "Revision requested.");

    return updated;
  });
}
