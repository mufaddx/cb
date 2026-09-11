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

  // Platform commission on the creator side (admin-controlled, same
  // TaxRule table the brand-side GST rule already lives in — just
  // applicableParty: "CREATOR" instead of "BRAND"). Posted as a
  // separate FEE debit rather than simply crediting a smaller
  // CREATOR_EARNING, so a creator's statement shows the full earning
  // and the deduction as two distinct, auditable lines instead of one
  // unexplained lower number. No rule active today -> 0%, unchanged
  // from before this existed.
  const creatorFeeRules = await tx.taxRule.findMany({
    where: { transactionType: "PLATFORM_FEE", applicableParty: "CREATOR", active: true },
  });
  const commissionRatePct = creatorFeeRules.reduce((sum, r) => sum + Number(r.rate), 0);
  const commissionAmount = Math.round(amount * (commissionRatePct / 100) * 100) / 100;
  if (commissionAmount > 0) {
    await postLedgerEntryWithinTx(tx, {
      walletId: creatorWallet.id,
      type: WalletTransactionType.FEE,
      amount: commissionAmount,
      referenceType: "ASSIGNMENT",
      referenceId: assignment.id,
      campaignId: assignment.campaignId,
      metadata: { commissionRatePct },
    });
  }

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
