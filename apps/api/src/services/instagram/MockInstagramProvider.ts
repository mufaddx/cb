import { randomUUID } from "crypto";
import type {
  ContentTypeInteractions,
  ExchangeCodeResult,
  InsightsSummary,
  InstagramProfile,
  InstagramProvider,
  TopContentItem,
} from "./InstagramProvider";

const AVATAR_COLORS = ["#4f46e5", "#0891b2", "#7c3aed", "#c2410c", "#0f766e"];

/** A real, self-contained image (an SVG data URI — no external host to
 * fail or rate-limit) instead of leaving profilePictureUrl empty, so
 * the UI's "does a profile picture actually render" path is exercised
 * in mock mode too, not just left untested until a real Meta account
 * exists. Deterministic per igUserId so the same mock account always
 * gets the same avatar instead of a new random one on every fetch. */
function mockAvatarDataUri(igUserId: string): string {
  const hash = [...igUserId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initial = (igUserId.replace(/^mock_ig_/, "")[0] ?? "C").toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='${color}'/><text x='48' y='63' font-family='Arial, sans-serif' font-size='42' font-weight='700' fill='#fff' text-anchor='middle'>${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
      profileImageUrl: mockAvatarDataUri(igUserId),
      fullName: "Mock Creator",
      bio: "Lifestyle & tech content, brand collabs open — mock bio (dev fixture, not real Instagram data).",
      followers: 52_400,
      avgReach: 18_200,
      avgViews: 24_600,
    };
    return { accessToken: `mock_token_${randomUUID()}`, expiresInSeconds: 60 * 60 * 24 * 60, profile };
  }

  async fetchProfile(_accessToken: string, igUserId: string): Promise<InstagramProfile> {
    // A small random walk on each refresh so "Refresh" visibly does
    // something in mock mode, instead of returning identical numbers
    // every time.
    const jitter = () => Math.floor((Math.random() - 0.3) * 1500);
    return {
      igUserId,
      username: `creator_${igUserId.slice(-6)}`,
      profileImageUrl: mockAvatarDataUri(igUserId),
      fullName: "Mock Creator",
      bio: "Lifestyle & tech content, brand collabs open — mock bio (dev fixture, not real Instagram data).",
      followers: Math.max(0, 52_400 + jitter()),
      avgReach: Math.max(0, 18_200 + jitter()),
      avgViews: Math.max(0, 24_600 + jitter()),
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

  async getInsightsSummary(_accessToken: string, periodDays = 30): Promise<InsightsSummary> {
    const mockThumb = (seed: string, color: string) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='${color}'/><text x='60' y='66' font-family='Arial, sans-serif' font-size='16' fill='#fff' text-anchor='middle' opacity='0.8'>${seed}</text></svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    };

    const topContent: TopContentItem[] = [
      { id: "mock_media_1", mediaType: "VIDEO", thumbnailUrl: mockThumb("Reel", "#4f46e5"), permalink: "https://instagram.com/p/mock1", timestamp: new Date().toISOString(), views: 4200, likes: 310, comments: 22 },
      { id: "mock_media_2", mediaType: "VIDEO", thumbnailUrl: mockThumb("Reel", "#0891b2"), permalink: "https://instagram.com/p/mock2", timestamp: new Date().toISOString(), views: 2800, likes: 190, comments: 14 },
      { id: "mock_media_3", mediaType: "IMAGE", thumbnailUrl: mockThumb("Post", "#7c3aed"), permalink: "https://instagram.com/p/mock3", timestamp: new Date().toISOString(), views: 1600, likes: 140, comments: 9 },
    ];

    const interactionsByType: ContentTypeInteractions[] = [
      { type: "REELS", count: 8, likes: 1240, comments: 96, shares: 44, saved: 60 },
      { type: "POSTS", count: 4, likes: 380, comments: 28, shares: 10, saved: 22 },
    ];

    // A flat-ish daily series with one visible spike, similar in shape
    // to what Instagram's own Insights chart tends to show for an
    // account with one post that outperformed the rest.
    const viewsSeries = Array.from({ length: periodDays }, (_, i) => {
      const date = new Date(Date.now() - (periodDays - 1 - i) * 86_400_000).toISOString().slice(0, 10);
      const spike = i === Math.floor(periodDays * 0.7) ? 5400 : 0;
      return { date, value: Math.max(0, Math.round(20 + Math.random() * 40 + spike)) };
    });

    return {
      periodDays,
      totalViews: viewsSeries.reduce((a, b) => a + b.value, 0),
      netFollowers: 12,
      totalInteractions: interactionsByType.reduce((a, t) => a + t.likes + t.comments + t.shares + t.saved, 0),
      viewsSeries,
      contentCounts: { reels: interactionsByType[0].count, posts: interactionsByType[1].count },
      topContent,
      interactionsByType,
    };
  }
}
