/** Cross-cutting domain enums referenced by both the API and the web app. */

export enum CampaignType {
  CLIPPING = "CLIPPING",
  CREATOR_CONTENT = "CREATOR_CONTENT",
  PRODUCT_REVIEW = "PRODUCT_REVIEW",
}

export enum TargetingMetric {
  FOLLOWER_COUNT = "FOLLOWER_COUNT",
  AVERAGE_REACH = "AVERAGE_REACH",
}

export enum AvailabilityStatus {
  AVAILABLE = "AVAILABLE",
  BUSY = "BUSY",
  PAUSED = "PAUSED",
}

export enum InstagramConnectionStatus {
  NOT_CONNECTED = "NOT_CONNECTED",
  CONNECTED = "CONNECTED",
  NEEDS_RECONNECTION = "NEEDS_RECONNECTION",
  SYNC_FAILED = "SYNC_FAILED",
}

export enum UsageRightType {
  ORGANIC_SOCIAL = "ORGANIC_SOCIAL",
  BRAND_REPOST = "BRAND_REPOST",
  WEBSITE = "WEBSITE",
  PAID_ADVERTISING = "PAID_ADVERTISING",
  CUSTOM = "CUSTOM",
}

export const DEFAULT_CLIPPING_RETENTION_DAYS = 30;

export enum RestrictedCategory {
  POLITICAL = "POLITICAL",
  HEALTH = "HEALTH",
  FINANCE = "FINANCE",
  GAMBLING = "GAMBLING",
  ADULT = "ADULT",
  RELIGIOUS = "RELIGIOUS",
  OTHER = "OTHER",
}
