import {
  AssignmentStatus as PrismaAssignmentStatus,
  InstagramStatus,
  Prisma,
  PrismaClient,
  RetentionStatus as PrismaRetentionStatus,
  VerificationResult,
} from "@prisma/client";
import { AssignmentStatus, ASSIGNMENT_TRANSITIONS, AuditAction, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { decryptSecret } from "../../lib/crypto";
import { getInstagramProvider } from "../../services/instagram";
import { releasePayout } from "../payouts/payouts.service";

const DISCLOSURE_PATTERN = /#ad\b|#sponsored\b|#partner\b|#collab\b/i;

/**
 * Moves an assignment VERIFICATION -> VERIFIED and decides what's
 * next: campaigns with a retention requirement (spec §23, default 30
 * days for Clipping) wait out the countdown before payout; campaigns
 * with none go straight to PAYABLE and have their payout released
 * immediately (there's nothing left to wait for). Shared by both the
 * automated path and the admin manual-decision path so the two never
 * diverge. Always called from inside an active transaction — never
 * pass the top-level PrismaClient here.
 */
async function markVerified(tx: Prisma.TransactionClient, assignmentId: string, actorId: string | null, actorRole: string) {
  const assignment = await tx.campaignAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: { campaign: true },
  });

  assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.VERIFICATION, AssignmentStatus.VERIFIED);

  const retentionDays = assignment.campaign.retentionDays;
  const verifiedAt = new Date();

  if (retentionDays > 0) {
    await tx.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        status: PrismaAssignmentStatus.VERIFIED,
        verifiedAt,
        retentionStatus: PrismaRetentionStatus.PENDING,
        retentionRequiredUntil: new Date(verifiedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000),
      },
    });
  } else {
    await tx.campaignAssignment.update({
      where: { id: assignmentId },
      data: { status: PrismaAssignmentStatus.VERIFIED, verifiedAt, retentionStatus: PrismaRetentionStatus.NOT_APPLICABLE },
    });
    assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.VERIFIED, AssignmentStatus.PAYABLE);
    await tx.campaignAssignment.update({
      where: { id: assignmentId },
      data: { status: PrismaAssignmentStatus.PAYABLE, payableAt: new Date() },
    });
  }

  await recordAudit(tx, {
    actorId,
    actorRole,
    action: AuditAction.VERIFICATION_PASSED,
    entityType: "CampaignAssignment",
    entityId: assignmentId,
  });

  if (retentionDays === 0) {
    await releasePayout(tx, assignment);
  }
}

async function markFailed(tx: Prisma.TransactionClient, assignmentId: string, actorId: string | null, actorRole: string) {
  assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.VERIFICATION, AssignmentStatus.FAILED);
  await tx.campaignAssignment.update({ where: { id: assignmentId }, data: { status: PrismaAssignmentStatus.FAILED } });
  await recordAudit(tx, {
    actorId,
    actorRole,
    action: AuditAction.VERIFICATION_FAILED,
    entityType: "CampaignAssignment",
    entityId: assignmentId,
  });
}

/**
 * Exported wrappers so another module (e.g. `modules/content` for
 * Creator Content campaign approval) can reuse the exact same
 * VERIFICATION -> VERIFIED/FAILED + retention-gating + instant-payout
 * logic instead of re-implementing it. Don't write a second copy of
 * this decision — the assignment doesn't care whether "verification"
 * meant an Instagram post check or a brand approving a video.
 */
export async function markAssignmentVerified(prisma: PrismaClient, assignmentId: string, actorId: string, actorRole: string) {
  return prisma.$transaction((tx) => markVerified(tx, assignmentId, actorId, actorRole));
}

export async function markAssignmentFailed(prisma: PrismaClient, assignmentId: string, actorId: string, actorRole: string) {
  return prisma.$transaction((tx) => markFailed(tx, assignmentId, actorId, actorRole));
}

/**
 * Automated checks (spec §22): correct account, post exists/owned by
 * the connected Instagram account, and disclosure hashtag present
 * when the campaign requires one. Runs via `InstagramProvider` (mock
 * or real Meta Graph API — see services/instagram).
 *
 * A hard mismatch (wrong/missing account, post not found) is an
 * unambiguous automated FAIL. A missing disclosure tag is left for
 * manual admin review instead of an automatic fail, since disclosure
 * can legitimately appear in a comment or the account bio — the
 * automated check can raise it but shouldn't be the final word.
 */
export async function runAutomatedVerification(prisma: PrismaClient, assignmentId: string) {
  const assignment = await prisma.campaignAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: { campaign: true, creator: { include: { instagramAccount: true } } },
  });

  if (assignment.status !== PrismaAssignmentStatus.VERIFICATION) {
    throw new ConflictError(`Assignment is not awaiting verification (current status: ${assignment.status})`);
  }
  if (!assignment.postUrl) {
    throw new ConflictError("Assignment has no submitted post URL to verify");
  }

  const account = assignment.creator.instagramAccount;
  if (!account || account.status !== InstagramStatus.CONNECTED) {
    await prisma.postVerification.create({
      data: {
        assignmentId,
        checkType: "ACCOUNT_MATCH",
        result: VerificationResult.FAIL,
        automated: true,
        evidenceJson: { reason: "No connected Instagram account" },
        checkedAt: new Date(),
      },
    });
    return; // left in VERIFICATION for manual review — no connected account to check against
  }

  const provider = getInstagramProvider();
  const accessToken = decryptSecret(account.accessTokenEncrypted);
  const { owned, caption } = await provider.verifyPostOwnership(accessToken, account.igUserId, assignment.postUrl);

  await prisma.postVerification.create({
    data: {
      assignmentId,
      checkType: "ACCOUNT_MATCH",
      result: owned ? VerificationResult.PASS : VerificationResult.FAIL,
      automated: true,
      evidenceJson: { igUserId: account.igUserId, postUrl: assignment.postUrl, caption },
      checkedAt: new Date(),
    },
  });

  if (!owned) {
    await prisma.$transaction((tx) => markFailed(tx, assignmentId, null, "SYSTEM"));
    return;
  }

  let disclosureOk = true;
  if (assignment.campaign.disclosureRequired) {
    disclosureOk = Boolean(caption && DISCLOSURE_PATTERN.test(caption));
    await prisma.postVerification.create({
      data: {
        assignmentId,
        checkType: "DISCLOSURE",
        result: disclosureOk ? VerificationResult.PASS : VerificationResult.FAIL,
        automated: true,
        evidenceJson: { caption },
        checkedAt: new Date(),
      },
    });
  }

  if (disclosureOk) {
    await prisma.$transaction((tx) => markVerified(tx, assignmentId, null, "SYSTEM"));
  }
  // else: leaves the assignment in VERIFICATION for an admin to review
  // the disclosure question via POST /api/verifications/:id/decide.
}

export type ManualDecision = "PASS" | "FAIL";

export async function decideVerification(
  prisma: PrismaClient,
  assignmentId: string,
  adminId: string,
  decision: ManualDecision,
  notes?: string
) {
  const assignment = await prisma.campaignAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError("Assignment not found");
  if (assignment.status !== PrismaAssignmentStatus.VERIFICATION) {
    throw new ConflictError(`Assignment is not awaiting verification (current status: ${assignment.status})`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.postVerification.create({
      data: {
        assignmentId,
        checkType: "MANUAL_REVIEW",
        result: decision === "PASS" ? VerificationResult.PASS : VerificationResult.FAIL,
        automated: false,
        checkedBy: adminId,
        checkedAt: new Date(),
        evidenceJson: notes ? { notes } : undefined,
      },
    });

    if (decision === "PASS") {
      await markVerified(tx, assignmentId, adminId, "CONTENT_REVIEWER");
    } else {
      await markFailed(tx, assignmentId, adminId, "CONTENT_REVIEWER");
    }

    return tx.campaignAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
  });
}

/** Clipping's post-verification queue — excludes CREATOR_CONTENT and
 * PRODUCT_REVIEW, which share their own review queue (`modules/content`)
 * since that's a brand/admin content approval, not an Instagram post check. */
export async function listVerificationQueue(prisma: PrismaClient) {
  return prisma.campaignAssignment.findMany({
    where: { status: PrismaAssignmentStatus.VERIFICATION, campaign: { type: "CLIPPING" } },
    include: { campaign: true, creator: true, postVerifications: { orderBy: { createdAt: "desc" } } },
    orderBy: { postSubmittedAt: "asc" },
  });
}
