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
}
