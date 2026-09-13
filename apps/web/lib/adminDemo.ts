/**
 * ADMIN DEMO MODE — preview-only sample data for the admin console.
 *
 * - Shown ONLY where a page has no real records (never mixed into a real list).
 * - Never sent to the API or written to the database.
 * - Every demo id starts with "demo-", and actions on demo rows are disabled.
 *
 * To turn it off: set ADMIN_DEMO_ENABLED to false. To remove it entirely,
 * delete this file and the withDemo / DEMO_* / isDemoId usages under app/admin.
 */
export const ADMIN_DEMO_ENABLED = true;

export const isDemoId = (id: string) => id.startsWith("demo-");

export function withDemo<T>(real: T[] | null, demo: T[], opts: { allow?: boolean } = {}): { items: T[] | null; isDemo: boolean } {
  if (real === null) return { items: null, isDemo: false };
  if (real.length === 0 && ADMIN_DEMO_ENABLED && opts.allow !== false) return { items: demo, isDemo: true };
  return { items: real, isDemo: false };
}

/** For single numbers on the dashboard: a real 0 shows a sample value (flagged). */
export function demoNumber(real: number | null | undefined, sample: number): { value: number | null; sample: boolean } {
  if (real === null || real === undefined) return { value: null, sample: false };
  if (real === 0 && ADMIN_DEMO_ENABLED) return { value: sample, sample: true };
  return { value: real, sample: false };
}

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/* ---------------- dashboard ---------------- */

export const DEMO_ANALYTICS = {
  brands: 128,
  creators: 2340,
  campaignsTotal: 412,
  campaignsLive: 37,
  campaignsCompleted: 318,
  gmv: 1845000,
  netRevenueEstimate: 221400,
  paymentsCount: 486,
  refundsCount: 6,
  refundsAmount: 42500,
  creatorPayouts: 1480000,
};

export const DEMO_QUEUE_COUNTS = {
  campaigns: 5,
  verification: 6,
  content: 12,
  retention: 14,
  kyc: 7,
  withdrawals: 9,
  withdrawalsAmount: 186400,
  disputes: 3,
  fraud: 4,
  support: 8,
};

/* ---------------- campaigns ---------------- */

export const DEMO_REVIEW_CAMPAIGNS = [
  {
    id: "demo-cmp-1",
    code: "VDX-2031",
    title: "Monsoon Skincare Launch — Reels",
    type: "CLIPPING",
    status: "UNDER_REVIEW",
    submittedAt: ago(0.2),
    brand: { companyName: "Glow Botanics" },
    pricingSnapshots: [{ totalAmount: "48600.00" }],
  },
  {
    id: "demo-cmp-2",
    code: "VDX-2032",
    title: "Festive Sneaker Drop — Creator Reviews",
    type: "CREATOR_CONTENT",
    status: "UNDER_REVIEW",
    submittedAt: ago(1),
    brand: { companyName: "UrbanStride Footwear" },
    pricingSnapshots: [{ totalAmount: "124000.00" }],
  },
];

export const DEMO_LIVE_CAMPAIGNS = [
  {
    id: "demo-live-1",
    code: "VDX-1987",
    title: "Chai Break Moments",
    type: "CLIPPING",
    status: "LIVE",
    liveAt: ago(4),
    brand: { companyName: "ChaiCraft Co." },
    targetingSlabs: [
      { id: "demo-slab-a", minValue: 10000, maxValue: 50000, quantity: 20, reserved: 14 },
      { id: "demo-slab-b", minValue: 50000, maxValue: null, quantity: 5, reserved: 2 },
    ],
  },
];

/* ---------------- people ---------------- */

export const DEMO_CREATORS = [
  {
    id: "demo-crt-1",
    fullName: "Ananya Sharma",
    displayName: "ananya.creates",
    availability: "AVAILABLE",
    kycStatus: "VERIFIED",
    qualityScore: "4.6",
    completionRate: "96",
    riskScore: "12",
    instagramAccount: { username: "ananya.creates", status: "CONNECTED" },
  },
  {
    id: "demo-crt-2",
    fullName: "Rahul Verma",
    displayName: "rahulfitlife",
    availability: "AVAILABLE",
    kycStatus: "SUBMITTED",
    qualityScore: "4.2",
    completionRate: "88",
    riskScore: "34",
    instagramAccount: { username: "rahulfitlife", status: "CONNECTED" },
  },
  {
    id: "demo-crt-3",
    fullName: "Sneha Iyer",
    displayName: "snehaeats",
    availability: "PAUSED",
    kycStatus: "NOT_STARTED",
    qualityScore: "3.9",
    completionRate: "71",
    riskScore: "72",
    instagramAccount: null,
  },
];

export const DEMO_BRANDS = [
  { id: "demo-brd-1", companyName: "Glow Botanics", contactPerson: "Priya Nair", industry: "Beauty & Skincare", createdAt: ago(40), _count: { campaigns: 6, products: 3 } },
  { id: "demo-brd-2", companyName: "UrbanStride Footwear", contactPerson: "Arjun Mehta", industry: "Fashion", createdAt: ago(22), _count: { campaigns: 4, products: 8 } },
  { id: "demo-brd-3", companyName: "ChaiCraft Co.", contactPerson: "Kabir Singh", industry: "Food & Beverage", createdAt: ago(9), _count: { campaigns: 9, products: 2 } },
];

export const DEMO_KYC = [
  { id: "demo-kyc-1", documentType: "PAN", status: "SUBMITTED", submittedAt: ago(0.3), creator: { fullName: "Ananya Sharma", displayName: "ananya.creates" } },
  { id: "demo-kyc-2", documentType: "AADHAAR", status: "SUBMITTED", submittedAt: ago(1.5), creator: { fullName: "Rahul Verma", displayName: "rahulfitlife" } },
];

/* ---------------- money & trust ---------------- */

export const DEMO_WITHDRAWALS = [
  {
    id: "demo-wd-1",
    amount: "4500.00",
    upiId: "ananya@okaxis",
    status: "REQUESTED",
    requestedAt: ago(0.1),
    creator: { fullName: "Ananya Sharma", displayName: "ananya.creates", kycStatus: "VERIFIED" },
  },
  {
    id: "demo-wd-2",
    amount: "12800.00",
    upiId: "rahulverma@ybl",
    status: "APPROVED",
    requestedAt: ago(1),
    creator: { fullName: "Rahul Verma", displayName: "rahulfitlife", kycStatus: "VERIFIED" },
  },
];

export const DEMO_PAYMENTS = [
  {
    id: "demo-pay-1",
    amount: "48600.00",
    status: "PAID",
    provider: "RAZORPAY",
    purpose: "CAMPAIGN",
    createdAt: ago(4),
    campaign: { title: "Chai Break Moments", code: "VDX-1987" },
    brand: { companyName: "ChaiCraft Co." },
    refunds: [] as Array<{ amount: string; status: string }>,
  },
  {
    id: "demo-pay-2",
    amount: "25000.00",
    status: "PARTIALLY_REFUNDED",
    provider: "RAZORPAY",
    purpose: "CAMPAIGN",
    createdAt: ago(12),
    campaign: { title: "Diwali Gifting Unboxing", code: "VDX-1954" },
    brand: { companyName: "Glow Botanics" },
    refunds: [{ amount: "5000.00", status: "COMPLETED" }],
  },
  {
    id: "demo-pay-3",
    amount: "10000.00",
    status: "PAID",
    provider: "RAZORPAY",
    purpose: "WALLET_TOPUP",
    createdAt: ago(2),
    campaign: null,
    brand: { companyName: "UrbanStride Footwear" },
    refunds: [] as Array<{ amount: string; status: string }>,
  },
];

export const DEMO_DISPUTES = [
  {
    id: "demo-dsp-1",
    type: "CONTENT_QUALITY",
    reason: "Reel posted without the required brand tag",
    description:
      "The creator's reel went live without the mandatory brand tag and paid-partnership disclosure that the brief asked for. The brand wants a repost or a partial refund.",
    status: "OPEN",
    createdAt: ago(0.5),
    campaign: { title: "Diwali Gifting Unboxing", code: "VDX-1954" },
  },
];

export const DEMO_FRAUD = [
  { id: "demo-frd-1", entityType: "CREATOR", entityId: "demo-creator-77", flagType: "FOLLOWER_SPIKE", riskScore: "82", status: "OPEN", createdAt: ago(0.4) },
  { id: "demo-frd-2", entityType: "CREATOR", entityId: "demo-creator-51", flagType: "DUPLICATE_UPI", riskScore: "64", status: "OPEN", createdAt: ago(2) },
];

export const DEMO_SLABS = [
  { id: "demo-slab-1", campaignType: "CLIPPING", metric: "FOLLOWER_COUNT", minValue: 1000, maxValue: 10000, payoutAmount: "800", feeAmount: "200", active: true },
  { id: "demo-slab-2", campaignType: "CLIPPING", metric: "FOLLOWER_COUNT", minValue: 10000, maxValue: 50000, payoutAmount: "2500", feeAmount: "500", active: true },
  { id: "demo-slab-3", campaignType: "CLIPPING", metric: "FOLLOWER_COUNT", minValue: 50000, maxValue: null, payoutAmount: "6000", feeAmount: "1200", active: true },
  { id: "demo-slab-4", campaignType: "CREATOR_CONTENT", metric: "FOLLOWER_COUNT", minValue: 10000, maxValue: 50000, payoutAmount: "5000", feeAmount: "1000", active: true },
];

export const DEMO_TAX_RULES = [
  { id: "demo-tax-1", taxType: "GST", rate: "18", transactionType: "PLATFORM_FEE", applicableParty: "BRAND", jurisdiction: "IN", active: true },
];

/* ---------------- campaign operations ---------------- */

export const DEMO_VERIFICATIONS = [
  {
    id: "demo-ver-1",
    postUrl: "https://instagram.com/p/DEMO-SAMPLE",
    campaign: { title: "Chai Break Moments", code: "VDX-1987" },
    creator: { displayName: "ananya.creates" },
    postVerifications: [
      { checkType: "POST_EXISTS", result: "PASS", evidenceJson: null as unknown },
      { checkType: "CAPTION_TAG", result: "FAIL", evidenceJson: null as unknown },
    ],
  },
];

export const DEMO_CONTENT = [
  {
    id: "demo-cnt-1",
    campaign: { title: "Protein Bar Taste Test", code: "VDX-2011" },
    creator: { displayName: "rahulfitlife" },
    contentSubmissions: [{ version: 2, fileKey: "demo/protein-bar-v2.mp4", status: "SUBMITTED" }],
  },
];

export const DEMO_RETENTION = [
  { id: "demo-ret-1", retentionRequiredUntil: ahead(5), campaign: { title: "Chai Break Moments", code: "VDX-1987", retentionDays: 15 }, creator: { displayName: "ananya.creates" } },
  { id: "demo-ret-2", retentionRequiredUntil: ago(0.1), campaign: { title: "Diwali Gifting Unboxing", code: "VDX-1954", retentionDays: 30 }, creator: { displayName: "snehaeats" } },
];

/* ---------------- support ---------------- */

export const DEMO_TICKETS = [
  {
    id: "demo-tkt-1",
    subject: "Payout not received after approval",
    status: "OPEN",
    priority: "HIGH",
    updatedAt: ago(0.1),
    user: { email: "ananya.demo@example.com", name: "Ananya Sharma" },
    _count: { messages: 2 },
  },
  {
    id: "demo-tkt-2",
    subject: "How do I change my campaign budget?",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    updatedAt: ago(1),
    user: { email: "brand.demo@example.com", name: "Priya Nair" },
    _count: { messages: 3 },
  },
];

export const DEMO_TICKET_MESSAGES: Record<string, Array<{ id: string; senderRole: string; body: string; createdAt: string }>> = {
  "demo-tkt-1": [
    { id: "demo-msg-1", senderRole: "USER", body: "My withdrawal of ₹4,500 was approved yesterday but I haven't received it in my UPI yet.", createdAt: ago(0.4) },
    { id: "demo-msg-2", senderRole: "USER", body: "UPI ID is ananya@okaxis. Please check.", createdAt: ago(0.1) },
  ],
  "demo-tkt-2": [
    { id: "demo-msg-3", senderRole: "USER", body: "We want to increase the budget for our live campaign. Is that possible?", createdAt: ago(1.4) },
    { id: "demo-msg-4", senderRole: "ADMIN", body: "Yes — share the campaign code and the new number of creators you want and we'll update it.", createdAt: ago(1.2) },
    { id: "demo-msg-5", senderRole: "USER", body: "Campaign VDX-1987, we'd like 10 more creators.", createdAt: ago(1) },
  ],
};
