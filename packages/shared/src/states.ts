/**
 * Canonical state machines for every stateful entity in the platform.
 *
 * Each enum is paired with a TRANSITIONS map of `state -> allowed next
 * states`. Services must call `assertTransition(map, from, to)` before
 * persisting a status change — this is what makes "backend must
 * enforce valid transitions" (spec §56/§57) real instead of aspirational.
 */

export class InvalidTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Invalid ${entity} transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition<S extends string>(
  entity: string,
  transitions: Record<S, readonly S[]>,
  from: S,
  to: S
): void {
  if (from === to) return; // idempotent no-op writes are allowed
  const allowed = transitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(entity, from, to);
  }
}

// ---------------------------------------------------------------
// Campaign (§56)
// ---------------------------------------------------------------
export enum CampaignStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  REJECTED = "REJECTED",
  APPROVED = "APPROVED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAID = "PAID",
  LIVE = "LIVE",
  MATCHING = "MATCHING",
  IN_PROGRESS = "IN_PROGRESS",
  CONTENT_REVIEW = "CONTENT_REVIEW",
  VERIFICATION = "VERIFICATION",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  DISPUTED = "DISPUTED",
  REFUNDED = "REFUNDED",
}

export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [CampaignStatus.SUBMITTED, CampaignStatus.CANCELLED],
  [CampaignStatus.SUBMITTED]: [CampaignStatus.UNDER_REVIEW, CampaignStatus.CANCELLED],
  [CampaignStatus.UNDER_REVIEW]: [
    CampaignStatus.APPROVED,
    CampaignStatus.REJECTED,
    CampaignStatus.CANCELLED,
  ],
  [CampaignStatus.REJECTED]: [CampaignStatus.DRAFT, CampaignStatus.CANCELLED],
  [CampaignStatus.APPROVED]: [CampaignStatus.PAYMENT_PENDING, CampaignStatus.CANCELLED],
  [CampaignStatus.PAYMENT_PENDING]: [CampaignStatus.PAID, CampaignStatus.CANCELLED],
  [CampaignStatus.PAID]: [CampaignStatus.LIVE],
  [CampaignStatus.LIVE]: [CampaignStatus.MATCHING, CampaignStatus.CANCELLED, CampaignStatus.DISPUTED],
  [CampaignStatus.MATCHING]: [
    CampaignStatus.IN_PROGRESS,
    CampaignStatus.CANCELLED,
    CampaignStatus.DISPUTED,
  ],
  [CampaignStatus.IN_PROGRESS]: [
    CampaignStatus.CONTENT_REVIEW,
    CampaignStatus.CANCELLED,
    CampaignStatus.DISPUTED,
  ],
  [CampaignStatus.CONTENT_REVIEW]: [
    CampaignStatus.VERIFICATION,
    CampaignStatus.IN_PROGRESS, // revision requested
    CampaignStatus.DISPUTED,
  ],
  [CampaignStatus.VERIFICATION]: [
    CampaignStatus.COMPLETED,
    CampaignStatus.CONTENT_REVIEW,
    CampaignStatus.DISPUTED,
  ],
  [CampaignStatus.COMPLETED]: [CampaignStatus.DISPUTED, CampaignStatus.REFUNDED],
  [CampaignStatus.CANCELLED]: [CampaignStatus.REFUNDED],
  [CampaignStatus.DISPUTED]: [
    CampaignStatus.COMPLETED,
    CampaignStatus.CANCELLED,
    CampaignStatus.REFUNDED,
  ],
  [CampaignStatus.REFUNDED]: [],
};

// ---------------------------------------------------------------
// Campaign Offer — the creator-facing invite that precedes an
// Assignment (spec §21). Separate from AssignmentStatus below: an
// Offer only ever reaches ACCEPTED/REJECTED/EXPIRED; accepting one
// creates a CampaignAssignment, which has its own (longer) lifecycle.
// ---------------------------------------------------------------
export enum OfferStatus {
  OFFERED = "OFFERED",
  VIEWED = "VIEWED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export const OFFER_TRANSITIONS: Record<OfferStatus, readonly OfferStatus[]> = {
  [OfferStatus.OFFERED]: [OfferStatus.VIEWED, OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.EXPIRED],
  [OfferStatus.VIEWED]: [OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.EXPIRED],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.REJECTED]: [],
  [OfferStatus.EXPIRED]: [],
};

// ---------------------------------------------------------------
// Campaign Assignment (§57)
// ---------------------------------------------------------------
export enum AssignmentStatus {
  OFFERED = "OFFERED",
  VIEWED = "VIEWED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  POST_PENDING = "POST_PENDING",
  POST_SUBMITTED = "POST_SUBMITTED",
  VERIFICATION = "VERIFICATION",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
  PAYABLE = "PAYABLE",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, readonly AssignmentStatus[]> = {
  [AssignmentStatus.OFFERED]: [
    AssignmentStatus.VIEWED,
    AssignmentStatus.ACCEPTED,
    AssignmentStatus.REJECTED,
    AssignmentStatus.EXPIRED,
  ],
  [AssignmentStatus.VIEWED]: [
    AssignmentStatus.ACCEPTED,
    AssignmentStatus.REJECTED,
    AssignmentStatus.EXPIRED,
  ],
  [AssignmentStatus.ACCEPTED]: [AssignmentStatus.POST_PENDING, AssignmentStatus.CANCELLED],
  [AssignmentStatus.REJECTED]: [],
  [AssignmentStatus.EXPIRED]: [],
  [AssignmentStatus.POST_PENDING]: [AssignmentStatus.POST_SUBMITTED, AssignmentStatus.CANCELLED],
  [AssignmentStatus.POST_SUBMITTED]: [AssignmentStatus.VERIFICATION, AssignmentStatus.CANCELLED],
  [AssignmentStatus.VERIFICATION]: [
    AssignmentStatus.VERIFIED,
    AssignmentStatus.FAILED,
    AssignmentStatus.POST_PENDING, // sent back for re-submission
  ],
  [AssignmentStatus.VERIFIED]: [AssignmentStatus.PAYABLE, AssignmentStatus.FAILED], // retention failure after posting
  [AssignmentStatus.FAILED]: [],
  [AssignmentStatus.PAYABLE]: [AssignmentStatus.PAID, AssignmentStatus.CANCELLED],
  [AssignmentStatus.PAID]: [],
  [AssignmentStatus.CANCELLED]: [],
};

// ---------------------------------------------------------------
// Payment (§58)
// ---------------------------------------------------------------
export enum PaymentStatus {
  CREATED = "CREATED",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUND_PENDING = "REFUND_PENDING",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  RECONCILIATION_REQUIRED = "RECONCILIATION_REQUIRED",
}

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [PaymentStatus.PENDING, PaymentStatus.FAILED],
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.RECONCILIATION_REQUIRED,
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.RECONCILIATION_REQUIRED,
  ],
  [PaymentStatus.PAID]: [PaymentStatus.REFUND_PENDING, PaymentStatus.PARTIALLY_REFUNDED],
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // retry creates new attempt at service layer
  [PaymentStatus.REFUND_PENDING]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.RECONCILIATION_REQUIRED,
  ],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED],
  [PaymentStatus.RECONCILIATION_REQUIRED]: [
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
  ],
};

// ---------------------------------------------------------------
// Refund (§84)
// ---------------------------------------------------------------
export enum RefundStatus {
  REQUESTED = "REQUESTED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export const REFUND_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  [RefundStatus.REQUESTED]: [RefundStatus.PROCESSING, RefundStatus.FAILED],
  [RefundStatus.PROCESSING]: [RefundStatus.COMPLETED, RefundStatus.FAILED],
  [RefundStatus.COMPLETED]: [],
  [RefundStatus.FAILED]: [RefundStatus.PROCESSING],
};

// ---------------------------------------------------------------
// Withdrawal (§34)
// ---------------------------------------------------------------
export enum WithdrawalStatus {
  REQUESTED = "REQUESTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  PAID = "PAID",
  FAILED = "FAILED",
  REJECTED = "REJECTED",
}

export const WITHDRAWAL_TRANSITIONS: Record<WithdrawalStatus, readonly WithdrawalStatus[]> = {
  [WithdrawalStatus.REQUESTED]: [WithdrawalStatus.UNDER_REVIEW, WithdrawalStatus.REJECTED],
  [WithdrawalStatus.UNDER_REVIEW]: [WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED],
  [WithdrawalStatus.APPROVED]: [WithdrawalStatus.PAID, WithdrawalStatus.FAILED],
  [WithdrawalStatus.PAID]: [],
  [WithdrawalStatus.FAILED]: [WithdrawalStatus.UNDER_REVIEW],
  [WithdrawalStatus.REJECTED]: [],
};

// ---------------------------------------------------------------
// KYC (§35)
// ---------------------------------------------------------------
export enum KycStatus {
  NOT_STARTED = "NOT_STARTED",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  RESUBMISSION_REQUIRED = "RESUBMISSION_REQUIRED",
}

export const KYC_TRANSITIONS: Record<KycStatus, readonly KycStatus[]> = {
  [KycStatus.NOT_STARTED]: [KycStatus.SUBMITTED],
  [KycStatus.SUBMITTED]: [KycStatus.UNDER_REVIEW],
  [KycStatus.UNDER_REVIEW]: [
    KycStatus.VERIFIED,
    KycStatus.REJECTED,
    KycStatus.RESUBMISSION_REQUIRED,
  ],
  [KycStatus.VERIFIED]: [],
  [KycStatus.REJECTED]: [],
  [KycStatus.RESUBMISSION_REQUIRED]: [KycStatus.SUBMITTED],
};

// ---------------------------------------------------------------
// Dispute (§86)
// ---------------------------------------------------------------
export enum DisputeStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  EVIDENCE_REQUESTED = "EVIDENCE_REQUESTED",
  DECISION = "DECISION",
  RESOLVED = "RESOLVED",
}

export const DISPUTE_TRANSITIONS: Record<DisputeStatus, readonly DisputeStatus[]> = {
  [DisputeStatus.OPEN]: [DisputeStatus.UNDER_REVIEW],
  [DisputeStatus.UNDER_REVIEW]: [DisputeStatus.EVIDENCE_REQUESTED, DisputeStatus.DECISION],
  [DisputeStatus.EVIDENCE_REQUESTED]: [DisputeStatus.UNDER_REVIEW],
  [DisputeStatus.DECISION]: [DisputeStatus.RESOLVED],
  [DisputeStatus.RESOLVED]: [],
};

// ---------------------------------------------------------------
// Shipping (§28)
// ---------------------------------------------------------------
export enum ShipmentStatus {
  ADDRESS_PENDING = "ADDRESS_PENDING",
  ADDRESS_SUBMITTED = "ADDRESS_SUBMITTED",
  READY_TO_SHIP = "READY_TO_SHIP",
  SHIPPED = "SHIPPED",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  DELIVERY_FAILED = "DELIVERY_FAILED",
  RETURNED = "RETURNED",
  RECEIVED = "RECEIVED",
}

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  [ShipmentStatus.ADDRESS_PENDING]: [ShipmentStatus.ADDRESS_SUBMITTED],
  [ShipmentStatus.ADDRESS_SUBMITTED]: [ShipmentStatus.READY_TO_SHIP],
  [ShipmentStatus.READY_TO_SHIP]: [ShipmentStatus.SHIPPED],
  [ShipmentStatus.SHIPPED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERY_FAILED],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED],
  [ShipmentStatus.DELIVERED]: [ShipmentStatus.RECEIVED, ShipmentStatus.RETURNED],
  [ShipmentStatus.DELIVERY_FAILED]: [ShipmentStatus.RETURNED, ShipmentStatus.SHIPPED],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.RECEIVED]: [],
};

// ---------------------------------------------------------------
// Wallet ledger transaction types (§59)
// ---------------------------------------------------------------
export enum WalletTransactionType {
  DEPOSIT = "DEPOSIT",
  RESERVE = "RESERVE",
  RELEASE = "RELEASE",
  SPEND = "SPEND",
  CREATOR_EARNING = "CREATOR_EARNING",
  REFUND = "REFUND",
  WITHDRAWAL = "WITHDRAWAL",
  ADJUSTMENT = "ADJUSTMENT",
  TAX = "TAX",
  FEE = "FEE",
  REVERSAL = "REVERSAL",
}

/** Transaction types that increase a wallet's available balance.
 * REFUND is deliberately NOT here: a brand refund decrements
 * *reserved* balance (money leaving the platform back to the brand's
 * payment method via the provider), it does not credit available
 * balance — see the dedicated REFUND case in
 * `postLedgerEntryWithinTx`. */
export const CREDIT_TYPES: readonly WalletTransactionType[] = [
  WalletTransactionType.DEPOSIT,
  WalletTransactionType.RELEASE,
  WalletTransactionType.CREATOR_EARNING,
  WalletTransactionType.REVERSAL,
];

/** Transaction types that decrease a wallet's available balance. */
export const DEBIT_TYPES: readonly WalletTransactionType[] = [
  WalletTransactionType.RESERVE,
  WalletTransactionType.SPEND,
  WalletTransactionType.WITHDRAWAL,
  WalletTransactionType.TAX,
  WalletTransactionType.FEE,
];
