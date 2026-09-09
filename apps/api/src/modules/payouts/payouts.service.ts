import { AssignmentStatus as PrismaAssignmentStatus, Prisma, WalletTransactionType } from "@prisma/client";
import { AssignmentStatus, ASSIGNMENT_TRANSITIONS, AuditAction, assertTransition } from "@antigravity/shared";
import { recordAudit } from "../audit/audit.service";
import { postSystemMessage } from "../messages/messages.service";
import { getOrCreateWalletForBrand, getOrCreateWalletForCreator, postLedgerEntryWithinTx } from "../wallet/wallet.service";

/**
 * Releases a creator's payout (spec §83): SPEND draws down the
 * brand's reserved balance, CREATOR_EARNING credits the creator's
 * available balance, and the assignment moves PAYABLE -> PAID — all
 * inside the caller's transaction, so a payout can never be posted
 * without the assignment reflecting it or vice versa.
 *
 * Shared by two callers: `retention.service.ts` (after retention
 * passes) and `verification.service.ts` (when a campaign has no
 * retention requirement at all, so PAYABLE is reached immediately on
 * verification instead of waiting on a countdown).
 */
export async function releasePayout(
  tx: Prisma.TransactionClient,
  assignment: { id: string; campaignId: string; creatorId: string; payoutAmount: unknown }
) {
  const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: assignment.campaignId } });
  const amount = Number(assignment.payoutAmount);

  const brandWallet = await getOrCreateWalletForBrand(tx, campaign.brandId);
  await postLedgerEntryWithinTx(tx, {
    walletId: brandWallet.id,
    type: WalletTransactionType.SPEND,
    amount,
    referenceType: "ASSIGNMENT",
    referenceId: assignment.id,
    campaignId: assignment.campaignId,
  });

  const creatorWallet = await getOrCreateWalletForCreator(tx, assignment.creatorId);
  await postLedgerEntryWithinTx(tx, {
    walletId: creatorWallet.id,
    type: WalletTransactionType.CREATOR_EARNING,
    amount,
    referenceType: "ASSIGNMENT",
    referenceId: assignment.id,
    campaignId: assignment.campaignId,
  });

  assertTransition("CampaignAssignment", ASSIGNMENT_TRANSITIONS, AssignmentStatus.PAYABLE, AssignmentStatus.PAID);
  await tx.campaignAssignment.update({
    where: { id: assignment.id },
    data: { status: PrismaAssignmentStatus.PAID, paidAt: new Date() },
  });

  await recordAudit(tx, {
    actorId: null,
    actorRole: "SYSTEM",
    action: AuditAction.PAYOUT_RELEASED,
    entityType: "CampaignAssignment",
    entityId: assignment.id,
    newValue: { amount },
  });
  await postSystemMessage(tx, assignment.campaignId, "Payment released.");
}
