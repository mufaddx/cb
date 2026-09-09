import { AssignmentStatus as PrismaAssignmentStatus, CampaignType, PrismaClient } from "@prisma/client";
import { AssignmentStatus, AuditAction, assertTransition, ASSIGNMENT_TRANSITIONS } from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { runAutomatedVerification } from "../verification/verification.service";
import { logger } from "../../lib/logger";

export interface SubmitPostInput {
  postUrl: string;
  screenshotKey?: string;
  notes?: string;
}

/**
 * Creator submits proof of posting (spec §21). Only the CLIPPING flow
 * is wired end to end in this slice — CREATOR_CONTENT's brief-and-
 * revision submission flow (ContentSubmission/ContentRevision) is a
 * separate, not-yet-built path (see docs/architecture.md).
 */
export async function submitPost(prisma: PrismaClient, assignmentId: string, creatorId: string, input: SubmitPostInput) {
  const assignment = await prisma.campaignAssignment.findUnique({
    where: { id: assignmentId },
    include: { campaign: true },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");
  if (assignment.creatorId !== creatorId) throw new UnauthorizedError();
  if (assignment.campaign.type !== CampaignType.CLIPPING) {
    throw new ValidationError(
      "Post submission is only available for Clipping campaigns in this build — Creator Content submission is not yet implemented."
    );
  }
  if (assignment.status !== PrismaAssignmentStatus.POST_PENDING) {
    throw new ConflictError(`Assignment is not awaiting a post submission (current status: ${assignment.status})`);
  }

  await prisma.$transaction(async (tx) => {
    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.POST_PENDING, AssignmentStatus.POST_SUBMITTED);
    await tx.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        status: PrismaAssignmentStatus.POST_SUBMITTED,
        postUrl: input.postUrl,
        postScreenshotKey: input.screenshotKey,
        postSubmittedAt: new Date(),
      },
    });
    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.CONTENT_SUBMITTED,
      entityType: "CampaignAssignment",
      entityId: assignmentId,
      newValue: { postUrl: input.postUrl },
      metadata: input.notes ? { notes: input.notes } : undefined,
    });

    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.POST_SUBMITTED, AssignmentStatus.VERIFICATION);
    await tx.campaignAssignment.update({ where: { id: assignmentId }, data: { status: PrismaAssignmentStatus.VERIFICATION } });
  });

  // Run automated verification as a follow-up step, not inside the
  // submission transaction — it calls an external provider (Meta
  // Graph API / mock), and a slow or failed provider call must not
  // fail the submission itself. If it throws, the assignment simply
  // stays in VERIFICATION awaiting manual admin review.
  try {
    await runAutomatedVerification(prisma, assignmentId);
  } catch (err) {
    logger.warn({ err, assignmentId }, "Automated verification failed to run; leaving for manual review");
  }

  return prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
}
