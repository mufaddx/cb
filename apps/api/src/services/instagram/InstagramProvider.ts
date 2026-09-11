export interface InstagramProfile {
  igUserId: string;
  username: string;
  profileImageUrl?: string;
  fullName?: string;
  bio?: string;
  followers: number;
  avgReach?: number;
  avgViews?: number;
}

export interface ExchangeCodeResult {
  accessToken: string;
  expiresInSeconds: number;
  profile: InstagramProfile;
}

export interface TopContentItem {
  id: string;
  mediaType: string;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  views: number | null;
  likes: number;
  comments: number;
}

export interface ContentTypeInteractions {
  type: "REELS" | "POSTS";
  count: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
}

export interface InsightsSummary {
  periodDays: number;
  // null (not a per-day series, and not summed) means the account-level
  // metric itself failed to fetch — shown as "—" rather than 0, since a
  // real 0 and "couldn't fetch this" are different things.
  totalViews: number | null;
  netFollowers: number | null;
  totalInteractions: number | null;
  viewsSeries: Array<{ date: string; value: number }>;
  contentCounts: { reels: number; posts: number };
  topContent: TopContentItem[];
  interactionsByType: ContentTypeInteractions[];
}

/**
 * Instagram/Meta connection abstraction (spec §15/§60). We NEVER
 * request or store an Instagram password (§90) — connection is always
 * via Meta's OAuth code exchange, and the resulting token is stored
 * encrypted (see InstagramAccount.accessTokenEncrypted).
 */
export interface InstagramProvider {
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<ExchangeCodeResult>;
  fetchProfile(accessToken: string, igUserId: string): Promise<InstagramProfile>;
  verifyPostOwnership(accessToken: string, igUserId: string, postUrl: string): Promise<{ owned: boolean; caption?: string }>;
  getInsightsSummary(accessToken: string, periodDays?: number): Promise<InsightsSummary>;
}
