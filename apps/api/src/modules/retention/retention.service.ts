import {
  AssignmentStatus as PrismaAssignmentStatus,
  InstagramStatus,
  PrismaClient,
  RetentionCheckStatus,
  RetentionStatus as PrismaRetentionStatus,
} from "@prisma/client";
import { AssignmentStatus, ASSIGNMENT_TRANSITIONS, AuditAction, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { decryptSecret } from "../../lib/crypto";
import { getInstagramProvider } from "../../services/instagram";
import { releasePayout } from "../payouts/payouts.service";

export interface RetentionCheckResult {
  assignmentId: string;
  outcome: "still_pending" | "passed" | "failed";
  daysRemaining?: number;
}

/**
 * Runs (or advances) the retention check for one assignment (spec
 * §23/§52). Before the required-until date, this just records a
 * PENDING checkpoint. On or after it, it makes the final call: the
 * post must still be live and owned by the same account, or retention
 * fails and the creator's payout is forfeited (spec §23 — funds stay
 * reserved at the campaign level; releasing them back to the brand is
 * the refund/dispute slice, not yet built).
 *
 * No background scheduler exists yet — see `runDueRetentionChecks`
 * for the admin-triggered batch entry point that stands in for one.
 */
export async function runRetentionCheck(prisma: PrismaClient, assignmentId: string): Promise<RetentionCheckResult> {
  const assignment = await prisma.campaignAssignment.findUnique({
    where: { id: assignmentId },
    include: { creator: { include: { instagramAccount: true } } },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");
  if (assignment.status !== PrismaAssignmentStatus.VERIFIED) {
    throw new ConflictError(`Assignment is not in retention (current status: ${assignment.status})`);
  }
  if (!assignment.retentionRequiredUntil) {
    throw new ConflictError("This assignment has no retention requirement");
  }

  const now = new Date();
  const verifiedAt = assignment.verifiedAt ?? assignment.createdAt;
  const dayNumber = Math.floor((now.getTime() - verifiedAt.getTime()) / (24 * 60 * 60 * 1000));

  if (now < assignment.retentionRequiredUntil) {
    await prisma.$transaction(async (tx) => {
      await tx.retentionCheck.create({
        data: { assignmentId, dayNumber, checkDate: now, status: RetentionCheckStatus.PENDING },
      });
      if (assignment.retentionStatus === PrismaRetentionStatus.PENDING) {
        await tx.campaignAssignment.update({
          where: { id: assignmentId },
          data: { retentionStatus: PrismaRetentionStatus.IN_PROGRESS },
        });
      }
    });
    const daysRemaining = Math.ceil((assignment.retentionRequiredUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { assignmentId, outcome: "still_pending", daysRemaining };
  }

  // Final check: is the post still live, on the same account?
  const account = assignment.creator.instagramAccount;
  let stillLive = false;
  if (account && account.status === InstagramStatus.CONNECTED && assignment.postUrl) {
    const provider = getInstagramProvider();
    const accessToken = decryptSecret(account.accessTokenEncrypted);
    const result = await provider.verifyPostOwnership(accessToken, account.igUserId, assignment.postUrl);
    stillLive = result.owned;
  }

  await prisma.$transaction(async (tx) => {
    await tx.retentionCheck.create({
      data: {
        assignmentId,
        dayNumber,
        checkDate: now,
        status: stillLive ? RetentionCheckStatus.PASSED : RetentionCheckStatus.FAILED,
      },
    });

    if (stillLive) {
      await tx.campaignAssignment.update({
        where: { id: assignmentId },
        data: { retentionStatus: PrismaRetentionStatus.PASSED },
      });
      assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.VERIFIED, AssignmentStatus.PAYABLE);
      await tx.campaignAssignment.update({
        where: { id: assignmentId },
        data: { status: PrismaAssignmentStatus.PAYABLE, payableAt: now },
      });
      await recordAudit(tx, {
        actorId: null,
        actorRole: "SYSTEM",
        action: AuditAction.RETENTION_PASSED,
        entityType: "CampaignAssignment",
        entityId: assignmentId,
      });

      await releasePayout(tx, assignment);
    } else {
      await tx.campaignAssignment.update({
        where: { id: assignmentId },
        data: { retentionStatus: PrismaRetentionStatus.FAILED },
      });
      assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.VERIFIED, AssignmentStatus.FAILED);
      await tx.campaignAssignment.update({ where: { id: assignmentId }, data: { status: PrismaAssignmentStatus.FAILED } });
      await recordAudit(tx, {
        actorId: null,
        actorRole: "SYSTEM",
        action: AuditAction.RETENTION_FAILED,
        entityType: "CampaignAssignment",
        entityId: assignmentId,
      });
    }
  });

  return { assignmentId, outcome: stillLive ? "passed" : "failed" };
}

export async function runDueRetentionChecks(prisma: PrismaClient): Promise<RetentionCheckResult[]> {
  const due = await prisma.campaignAssignment.findMany({
    where: {
      status: PrismaAssignmentStatus.VERIFIED,
      retentionStatus: { in: [PrismaRetentionStatus.PENDING, PrismaRetentionStatus.IN_PROGRESS] },
      retentionRequiredUntil: { lte: new Date() },
    },
    select: { id: true },
  });

  const results: RetentionCheckResult[] = [];
  for (const { id } of due) {
    results.push(await runRetentionCheck(prisma, id));
  }
  return results;
}

export async function listRetentionQueue(prisma: PrismaClient) {
  return prisma.campaignAssignment.findMany({
    where: {
      status: PrismaAssignmentStatus.VERIFIED,
      retentionStatus: { in: [PrismaRetentionStatus.PENDING, PrismaRetentionStatus.IN_PROGRESS] },
    },
    include: { campaign: true, creator: true },
    orderBy: { retentionRequiredUntil: "asc" },
  });
}
