/**
 * Roles and permissions (spec §91).
 *
 * RBAC is additive: a user has one or more roles; each role grants a
 * fixed permission set. Permission checks always go through
 * `roleHasPermission` / the API's `requirePermission` middleware —
 * never string-compare role names in route handlers.
 */

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  OPERATIONS_ADMIN = "OPERATIONS_ADMIN",
  FINANCE_ADMIN = "FINANCE_ADMIN",
  KYC_ADMIN = "KYC_ADMIN",
  CONTENT_REVIEWER = "CONTENT_REVIEWER",
  SUPPORT_ADMIN = "SUPPORT_ADMIN",
  BRAND = "BRAND",
  CREATOR = "CREATOR",
}

export enum Permission {
  // Campaigns
  CAMPAIGN_CREATE_OWN = "CAMPAIGN_CREATE_OWN",
  CAMPAIGN_READ_OWN = "CAMPAIGN_READ_OWN",
  CAMPAIGN_READ_ALL = "CAMPAIGN_READ_ALL",
  CAMPAIGN_REVIEW = "CAMPAIGN_REVIEW",
  CAMPAIGN_CANCEL_OWN = "CAMPAIGN_CANCEL_OWN",

  // Creators / assignments
  ASSIGNMENT_READ_OWN = "ASSIGNMENT_READ_OWN",
  ASSIGNMENT_MANAGE_ALL = "ASSIGNMENT_MANAGE_ALL",
  OFFER_READ_OWN = "OFFER_READ_OWN",
  OFFER_RESPOND_OWN = "OFFER_RESPOND_OWN",
  MATCHING_TRIGGER = "MATCHING_TRIGGER",
  INSTAGRAM_MANAGE_OWN = "INSTAGRAM_MANAGE_OWN",

  // Content / verification / retention
  CONTENT_SUBMIT_OWN = "CONTENT_SUBMIT_OWN",
  CONTENT_REVIEW = "CONTENT_REVIEW",
  CONTENT_REVIEW_OWN = "CONTENT_REVIEW_OWN", // brand reviewing submissions on ITS OWN campaigns
  RETENTION_MANAGE = "RETENTION_MANAGE",

  // Shipping / products
  PRODUCT_MANAGE_OWN = "PRODUCT_MANAGE_OWN",
  SHIPPING_MANAGE_OWN = "SHIPPING_MANAGE_OWN", // creator: submit address, confirm receipt
  SHIPMENT_MANAGE_OWN = "SHIPMENT_MANAGE_OWN", // brand: create/track shipment
  SHIPMENT_MANAGE_ALL = "SHIPMENT_MANAGE_ALL",

  // Financial
  WALLET_READ_OWN = "WALLET_READ_OWN",
  WALLET_READ_ALL = "WALLET_READ_ALL",
  PAYMENT_MANAGE_ALL = "PAYMENT_MANAGE_ALL",
  WITHDRAWAL_REQUEST_OWN = "WITHDRAWAL_REQUEST_OWN",
  WITHDRAWAL_MANAGE_ALL = "WITHDRAWAL_MANAGE_ALL",
  REFUND_MANAGE_ALL = "REFUND_MANAGE_ALL",

  // KYC (strictly siloed from brands, §35/§92)
  KYC_SUBMIT_OWN = "KYC_SUBMIT_OWN",
  KYC_REVIEW = "KYC_REVIEW",

  // Agreements / documents / messages
  DOCUMENT_READ_OWN = "DOCUMENT_READ_OWN",
  DOCUMENT_READ_ALL = "DOCUMENT_READ_ALL",
  MESSAGE_READ_OWN = "MESSAGE_READ_OWN",

  // Disputes / fraud
  DISPUTE_CREATE_OWN = "DISPUTE_CREATE_OWN",
  DISPUTE_MANAGE_ALL = "DISPUTE_MANAGE_ALL",
  FRAUD_MANAGE = "FRAUD_MANAGE",

  // Admin / platform
  PRICING_MANAGE = "PRICING_MANAGE",
  USER_MANAGE_ALL = "USER_MANAGE_ALL",
  AUDIT_READ_ALL = "AUDIT_READ_ALL",
  ADMIN_ROLE_MANAGE = "ADMIN_ROLE_MANAGE",
}

const ALL_ADMIN_READ: Permission[] = [
  Permission.CAMPAIGN_READ_ALL,
  Permission.ASSIGNMENT_MANAGE_ALL,
  Permission.AUDIT_READ_ALL,
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.OPERATIONS_ADMIN]: [
    ...ALL_ADMIN_READ,
    Permission.USER_MANAGE_ALL,
    Permission.CAMPAIGN_REVIEW,
    Permission.CONTENT_REVIEW,
    Permission.SHIPMENT_MANAGE_ALL,
    Permission.DOCUMENT_READ_ALL,
    Permission.DISPUTE_MANAGE_ALL,
    Permission.MATCHING_TRIGGER,
    Permission.RETENTION_MANAGE,
  ],

  [Role.FINANCE_ADMIN]: [
    Permission.WALLET_READ_ALL,
    Permission.PAYMENT_MANAGE_ALL,
    Permission.WITHDRAWAL_MANAGE_ALL,
    Permission.REFUND_MANAGE_ALL,
    Permission.DOCUMENT_READ_ALL,
    Permission.AUDIT_READ_ALL,
  ],

  [Role.KYC_ADMIN]: [Permission.KYC_REVIEW, Permission.AUDIT_READ_ALL],

  [Role.CONTENT_REVIEWER]: [
    Permission.CONTENT_REVIEW,
    Permission.CAMPAIGN_READ_ALL,
    Permission.AUDIT_READ_ALL,
  ],

  [Role.SUPPORT_ADMIN]: [
    Permission.MESSAGE_READ_OWN,
    Permission.DISPUTE_MANAGE_ALL,
    Permission.CAMPAIGN_READ_ALL,
  ],

  [Role.BRAND]: [
    Permission.CAMPAIGN_CREATE_OWN,
    Permission.CAMPAIGN_READ_OWN,
    Permission.CAMPAIGN_CANCEL_OWN,
    Permission.ASSIGNMENT_READ_OWN,
    Permission.PRODUCT_MANAGE_OWN,
    Permission.SHIPMENT_MANAGE_OWN,
    Permission.CONTENT_REVIEW_OWN,
    Permission.WALLET_READ_OWN,
    Permission.DOCUMENT_READ_OWN,
    Permission.MESSAGE_READ_OWN,
    Permission.DISPUTE_CREATE_OWN,
  ],

  [Role.CREATOR]: [
    Permission.ASSIGNMENT_READ_OWN,
    Permission.OFFER_READ_OWN,
    Permission.OFFER_RESPOND_OWN,
    Permission.INSTAGRAM_MANAGE_OWN,
    Permission.CONTENT_SUBMIT_OWN,
    Permission.SHIPPING_MANAGE_OWN,
    Permission.WALLET_READ_OWN,
    Permission.WITHDRAWAL_REQUEST_OWN,
    Permission.KYC_SUBMIT_OWN,
    Permission.DOCUMENT_READ_OWN,
    Permission.MESSAGE_READ_OWN,
    Permission.DISPUTE_CREATE_OWN,
  ],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function anyRoleHasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((r) => roleHasPermission(r, permission));
}
