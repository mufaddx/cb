import { randomUUID } from "crypto";
import type {
  ExchangeCodeResult,
  InstagramProfile,
  InstagramProvider,
} from "./InstagramProvider";

/** Dev/test adapter: returns deterministic fixture data instead of
 * calling Meta, so the connect/verify flows are fully exercisable
 * before a Meta Developer App exists. Never enabled in production. */
export class MockInstagramProvider implements InstagramProvider {
  getAuthorizationUrl(state: string): string {
    return `/dev/instagram-mock-consent?state=${encodeURIComponent(state)}`;
  }

  async exchangeCodeForToken(code: string): Promise<ExchangeCodeResult> {
    const igUserId = `mock_ig_${code.slice(0, 8) || randomUUID().slice(0, 8)}`;
    const profile: InstagramProfile = {
      igUserId,
      username: `creator_${igUserId.slice(-6)}`,
      followers: 52_400,
      avgReach: 18_200,
      avgViews: 24_600,
    };
    return { accessToken: `mock_token_${randomUUID()}`, expiresInSeconds: 60 * 60 * 24 * 60, profile };
  }

  async fetchProfile(_accessToken: string, igUserId: string): Promise<InstagramProfile> {
    return {
      igUserId,
      username: `creator_${igUserId.slice(-6)}`,
      followers: 52_400,
      avgReach: 18_200,
      avgViews: 24_600,
    };
  }

  /**
   * Deterministic fixture, driven by magic substrings in the post URL
   * so dev/test code can exercise every verification/retention branch
   * without a real Meta account:
   *   - URL contains "not-found"    -> ownership check fails
   *   - URL contains "no-disclosure" -> owned, but caption has no #ad tag
   *   - anything else                -> owned, with a disclosure tag
   */
  async verifyPostOwnership(
    _accessToken: string,
    _igUserId: string,
    postUrl: string
  ): Promise<{ owned: boolean; caption?: string }> {
    if (postUrl.includes("not-found")) {
      return { owned: false };
    }
    if (postUrl.includes("no-disclosure")) {
      return { owned: true, caption: "Mock caption for development verification (no tag)" };
    }
    return { owned: true, caption: "Mock caption for development verification #ad" };
  }
}
