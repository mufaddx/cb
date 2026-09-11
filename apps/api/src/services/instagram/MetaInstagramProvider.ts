import type {
  ContentTypeInteractions,
  ExchangeCodeResult,
  InsightsSummary,
  InstagramProfile,
  InstagramProvider,
  TopContentItem,
} from "./InstagramProvider";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

interface MediaWithMetrics {
  id: string;
  mediaType: string;
  mediaProductType: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  permalink: string;
  timestamp: string;
  likes: number;
  comments: number;
  reach: number | null;
  views: number | null; // "plays" on a video/reel, otherwise null (feed photos have no separate view count)
  shares: number | null;
  saved: number | null;
}

/**
 * "Instagram API with Instagram Login" adapter (Meta's newer, creator-
 * facing integration — added 2024). A creator logs in directly with
 * their Instagram credentials at instagram.com; no Facebook account or
 * linked Facebook Page is required.
 *
 * This is deliberately NOT "Facebook Login for Business" (the older
 * product, which authenticates via facebook.com and requires a
 * Facebook Page with an Instagram Business Account linked to it) —
 * that flow was tried first and rejected here specifically because it
 * shows a Facebook login screen, which is wrong for a platform whose
 * users are Instagram creators, not Facebook Page admins.
 *
 * META_APP_ID/META_APP_SECRET here are the Instagram App ID/Secret
 * shown on the Meta app's "Instagram" product -> "API setup with
 * Instagram login" page — NOT the Facebook App ID/Secret from
 * Settings -> Basic. The two look identical in format and are easy to
 * mix up; they are not interchangeable.
 */
export class MetaInstagramProvider implements InstagramProvider {
  private authBase = "https://www.instagram.com";
  private tokenBase = "https://api.instagram.com";
  private graphBase = "https://graph.instagram.com/v21.0";

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.META_APP_ID!,
      redirect_uri: env.META_REDIRECT_URI!,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_manage_insights",
      state,
    });
    return `${this.authBase}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<ExchangeCodeResult> {
    // Step 1: short-lived token (form-encoded POST body — this is the
    // one Instagram Login endpoint that does NOT accept query params).
    const form = new URLSearchParams({
      client_id: env.META_APP_ID!,
      client_secret: env.META_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: env.META_REDIRECT_URI!,
      code,
    });
    const shortTokenRes = await fetch(`${this.tokenBase}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!shortTokenRes.ok) {
      throw new Error(`Instagram token exchange failed (${shortTokenRes.status}): ${await shortTokenRes.text()}`);
    }
    const { access_token: shortLivedToken, user_id } = (await shortTokenRes.json()) as {
      access_token: string;
      user_id: string;
    };

    // Step 2: exchange for a long-lived token (60 days) — the
    // short-lived one from step 1 only lasts about an hour.
    const longTokenRes = await fetch(
      `${this.graphBase}/access_token?` +
        new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: env.META_APP_SECRET!,
          access_token: shortLivedToken,
        })
    );
    if (!longTokenRes.ok) {
      throw new Error(`Instagram long-lived token exchange failed (${longTokenRes.status}): ${await longTokenRes.text()}`);
    }
    const { access_token: accessToken, expires_in: expiresInSeconds } = (await longTokenRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    const profile = await this.fetchProfile(accessToken, user_id);
    return { accessToken, expiresInSeconds, profile };
  }

  // `igUserId` is accepted (and returned) for interface compatibility
  // with the other provider and with refresh/verify call sites that
  // store it — but every actual call here goes through the "me" alias,
  // not a direct `/{igUserId}` node lookup. Instagram Login access
  // tokens are single-account-scoped, and Graph API rejects fetching
  // that account's own numeric id as a standalone node right after
  // auth ("Unsupported get request ... does not exist, cannot be
  // loaded due to missing permissions" / error_subcode 33) — "me" is
  // the documented, reliable way to address the token's own account.
  async fetchProfile(accessToken: string, igUserId: string): Promise<InstagramProfile> {
    const res = await fetch(
      `${this.graphBase}/me?fields=id,username,name,biography,profile_picture_url,followers_count&access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Instagram profile fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      id: string;
      username: string;
      name?: string;
      biography?: string;
      profile_picture_url?: string;
      followers_count: number;
    };

    // Best-effort: reach/views come from the account's recent posts'
    // insights, a handful of extra calls beyond the basic profile
    // fetch above. Never let a failure here (rate limit, a post too
    // new for insights to have settled, missing permission) fail the
    // whole connect/refresh — the profile itself is already good.
    const media = await this.fetchRecentMediaWithMetrics(accessToken, 12).catch((err) => {
      logger.warn({ err }, "Instagram fetchRecentMediaWithMetrics threw during fetchProfile");
      return [] as MediaWithMetrics[];
    });
    const reaches = media.map((m) => m.reach).filter((v): v is number => v != null);
    const views = media.map((m) => m.views).filter((v): v is number => v != null);

    return {
      igUserId: data.id || igUserId,
      username: data.username,
      profileImageUrl: data.profile_picture_url,
      fullName: data.name,
      bio: data.biography,
      followers: data.followers_count,
      avgReach: reaches.length ? Math.round(reaches.reduce((a, b) => a + b, 0) / reaches.length) : undefined,
      avgViews: views.length ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : undefined,
    };
  }

  /** Fetches the account's recent posts/reels plus each one's own
   * insights in one pass — the shared data source behind fetchProfile's
   * avg reach/views AND getInsightsSummary's top-content/interactions
   * breakdown, so those two callers don't duplicate this logic (they
   * still make separate API calls at separate times; this only avoids
   * writing the media+insights fetch twice).
   *
   * Deliberately does NOT include Stories: Instagram's Graph API only
   * exposes CURRENTLY ACTIVE stories (via a separate /me/stories edge),
   * never historical ones — there is no way to reconstruct "26 stories
   * in the last 30 days" the way Instagram's own app shows it, for any
   * third-party app. Feed posts and Reels are what's actually available.
   */
  private async fetchRecentMediaWithMetrics(accessToken: string, limit: number): Promise<MediaWithMetrics[]> {
    const mediaRes = await fetch(
      `${this.graphBase}/me/media?fields=id,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${accessToken}`
    );
    if (!mediaRes.ok) {
      // This is exactly the call whose silent failure looks like "the
      // account has no posts" from the UI's side — log the real Graph
      // API error body so a real cause (bad scope, wrong API version,
      // rate limit) is visible in Render logs instead of just showing
      // as zeros with no trace anywhere.
      logger.warn({ status: mediaRes.status, body: await mediaRes.text().catch(() => "") }, "Instagram /me/media fetch failed");
      return [];
    }
    const mediaJson = (await mediaRes.json()) as {
      data?: Array<{
        id: string;
        media_type: string;
        media_product_type: string;
        thumbnail_url?: string;
        media_url?: string;
        permalink: string;
        timestamp: string;
        like_count?: number;
        comments_count?: number;
      }>;
    };
    const items = mediaJson.data ?? [];
    if (items.length === 0) return [];

    const results = await Promise.allSettled(
      items.map(async (item): Promise<MediaWithMetrics> => {
        const isVideo = item.media_type === "VIDEO";
        const metrics = isVideo ? "reach,plays,shares,saved" : "reach,shares,saved";
        let byName = new Map<string, number | undefined>();
        try {
          const insightsRes = await fetch(`${this.graphBase}/${item.id}/insights?metric=${metrics}&access_token=${accessToken}`);
          if (insightsRes.ok) {
            const insightsJson = (await insightsRes.json()) as { data?: Array<{ name: string; values?: Array<{ value: number }> }> };
            byName = new Map((insightsJson.data ?? []).map((m) => [m.name, m.values?.[0]?.value]));
          } else {
            logger.warn({ mediaId: item.id, status: insightsRes.status, body: await insightsRes.text().catch(() => "") }, "Instagram per-post insights fetch failed");
          }
        } catch (err) {
          // A single post's insights failing (too new, rate limited)
          // shouldn't drop it from the list — it just has null metrics.
          logger.warn({ mediaId: item.id, err }, "Instagram per-post insights fetch threw");
        }
        return {
          id: item.id,
          mediaType: item.media_type,
          mediaProductType: item.media_product_type,
          thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
          mediaUrl: item.media_url ?? null,
          permalink: item.permalink,
          timestamp: item.timestamp,
          likes: item.like_count ?? 0,
          comments: item.comments_count ?? 0,
          reach: byName.get("reach") ?? null,
          views: byName.get("plays") ?? null,
          shares: byName.get("shares") ?? null,
          saved: byName.get("saved") ?? null,
        };
      })
    );

    return results.filter((r): r is PromiseFulfilledResult<MediaWithMetrics> => r.status === "fulfilled").map((r) => r.value);
  }

  /** Sums a single account-level metric's daily time series over the
   * period — used for total views, net follower change, and total
   * interactions. Returns null (not 0) on any failure, so the UI can
   * show "—" rather than a real-looking zero for a metric that simply
   * couldn't be fetched (wrong permission, metric renamed between API
   * versions, etc.). */
  private async fetchAccountMetricSeries(
    accessToken: string,
    metric: string,
    sinceUnix: number,
    untilUnix: number
  ): Promise<Array<{ date: string; value: number }> | null> {
    try {
      const res = await fetch(
        `${this.graphBase}/me/insights?` +
          new URLSearchParams({
            metric,
            period: "day",
            metric_type: "time_series",
            since: String(sinceUnix),
            until: String(untilUnix),
            access_token: accessToken,
          })
      );
      if (!res.ok) {
        logger.warn({ metric, status: res.status, body: await res.text().catch(() => "") }, "Instagram account-level insights fetch failed");
        return null;
      }
      const json = (await res.json()) as {
        data?: Array<{ values?: Array<{ value: number; end_time: string }> }>;
      };
      const values = json.data?.[0]?.values ?? [];
      return values.map((v) => ({ date: v.end_time.slice(0, 10), value: v.value }));
    } catch (err) {
      logger.warn({ metric, err }, "Instagram account-level insights fetch threw");
      return null;
    }
  }

  async getInsightsSummary(accessToken: string, periodDays = 30): Promise<InsightsSummary> {
    const untilUnix = Math.floor(Date.now() / 1000);
    const sinceUnix = untilUnix - periodDays * 24 * 60 * 60;

    const [media, viewsSeriesRaw, netFollowersSeriesRaw, interactionsSeriesRaw] = await Promise.all([
      this.fetchRecentMediaWithMetrics(accessToken, 25).catch((err) => {
        logger.warn({ err }, "Instagram fetchRecentMediaWithMetrics threw during getInsightsSummary");
        return [] as MediaWithMetrics[];
      }),
      this.fetchAccountMetricSeries(accessToken, "views", sinceUnix, untilUnix),
      this.fetchAccountMetricSeries(accessToken, "follower_count", sinceUnix, untilUnix),
      this.fetchAccountMetricSeries(accessToken, "total_interactions", sinceUnix, untilUnix),
    ]);

    const sum = (series: Array<{ value: number }> | null) => (series ? series.reduce((a, b) => a + b.value, 0) : null);

    // Only feed posts and Reels — see fetchRecentMediaWithMetrics's doc
    // comment on why Stories can't be included.
    const reels = media.filter((m) => m.mediaProductType === "REELS");
    const posts = media.filter((m) => m.mediaProductType !== "REELS");

    const summarize = (type: "REELS" | "POSTS", items: MediaWithMetrics[]): ContentTypeInteractions => ({
      type,
      count: items.length,
      likes: items.reduce((a, m) => a + m.likes, 0),
      comments: items.reduce((a, m) => a + m.comments, 0),
      shares: items.reduce((a, m) => a + (m.shares ?? 0), 0),
      saved: items.reduce((a, m) => a + (m.saved ?? 0), 0),
    });

    const topContent: TopContentItem[] = [...media]
      .sort((a, b) => (b.views ?? b.reach ?? 0) - (a.views ?? a.reach ?? 0))
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        mediaType: m.mediaType,
        thumbnailUrl: m.thumbnailUrl,
        permalink: m.permalink,
        timestamp: m.timestamp,
        views: m.views ?? m.reach,
        likes: m.likes,
        comments: m.comments,
      }));

    return {
      periodDays,
      totalViews: sum(viewsSeriesRaw),
      netFollowers: sum(netFollowersSeriesRaw),
      totalInteractions: sum(interactionsSeriesRaw),
      viewsSeries: viewsSeriesRaw ?? [],
      contentCounts: { reels: reels.length, posts: posts.length },
      topContent,
      interactionsByType: [summarize("REELS", reels), summarize("POSTS", posts)],
    };
  }

  async verifyPostOwnership(
    accessToken: string,
    _igUserId: string,
    postUrl: string
  ): Promise<{ owned: boolean; caption?: string }> {
    // Resolve the media by matching permalink against the account's
    // recent media via the Graph API, since Graph has no
    // permalink -> media-id lookup endpoint. Same "me" reasoning as
    // fetchProfile above — the token is already scoped to one account.
    const res = await fetch(
      `${this.graphBase}/me/media?fields=permalink,caption&limit=50&access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Instagram media list fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { data: Array<{ permalink: string; caption?: string }> };
    const match = data.data.find((m) => normalizeUrl(m.permalink) === normalizeUrl(postUrl));
    return match ? { owned: true, caption: match.caption } : { owned: false };
  }
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").toLowerCase();
}
