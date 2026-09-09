import type {
  ExchangeCodeResult,
  InstagramProfile,
  InstagramProvider,
} from "./InstagramProvider";
import { env } from "../../config/env";

/**
 * Official Meta Graph API adapter (spec §15/§60). Uses the
 * Instagram-Graph-API-via-Facebook-Login flow: OAuth code exchange,
 * long-lived token exchange, then Graph API calls for profile/insights.
 *
 * This talks to the real Meta endpoints and requires META_APP_ID /
 * META_APP_SECRET / META_REDIRECT_URI — the env loader refuses to
 * select this provider without them.
 */
export class MetaInstagramProvider implements InstagramProvider {
  private graphBase = "https://graph.facebook.com/v19.0";

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.META_APP_ID!,
      redirect_uri: env.META_REDIRECT_URI!,
      state,
      scope: "instagram_basic,instagram_manage_insights,pages_show_list",
      response_type: "code",
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<ExchangeCodeResult> {
    const tokenRes = await fetch(
      `${this.graphBase}/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.META_APP_ID!,
          client_secret: env.META_APP_SECRET!,
          redirect_uri: env.META_REDIRECT_URI!,
          code,
        })
    );
    if (!tokenRes.ok) {
      throw new Error(`Meta token exchange failed (${tokenRes.status}): ${await tokenRes.text()}`);
    }
    const { access_token, expires_in } = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    // Resolve the connected Instagram Business Account behind the user's page.
    const pagesRes = await fetch(
      `${this.graphBase}/me/accounts?fields=instagram_business_account&access_token=${access_token}`
    );
    const pagesJson = (await pagesRes.json()) as {
      data: Array<{ instagram_business_account?: { id: string } }>;
    };
    const igUserId = pagesJson.data?.[0]?.instagram_business_account?.id;
    if (!igUserId) {
      throw new Error("No Instagram Business Account is linked to this Facebook Page.");
    }

    const profile = await this.fetchProfile(access_token, igUserId);
    return { accessToken: access_token, expiresInSeconds: expires_in, profile };
  }

  async fetchProfile(accessToken: string, igUserId: string): Promise<InstagramProfile> {
    const res = await fetch(
      `${this.graphBase}/${igUserId}?fields=username,profile_picture_url,followers_count&access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Meta profile fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      username: string;
      profile_picture_url?: string;
      followers_count: number;
    };

    // Average reach/views require the Insights API against recent
    // media and are computed by the metric-sync background job
    // (jobs/syncInstagramMetrics), not on every profile fetch.
    return {
      igUserId,
      username: data.username,
      profileImageUrl: data.profile_picture_url,
      followers: data.followers_count,
    };
  }

  async verifyPostOwnership(
    accessToken: string,
    igUserId: string,
    postUrl: string
  ): Promise<{ owned: boolean; caption?: string }> {
    // Resolve the media by matching permalink against the account's
    // recent media via the Graph API, since Graph has no
    // permalink -> media-id lookup endpoint.
    const res = await fetch(
      `${this.graphBase}/${igUserId}/media?fields=permalink,caption&limit=50&access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Meta media list fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { data: Array<{ permalink: string; caption?: string }> };
    const match = data.data.find((m) => normalizeUrl(m.permalink) === normalizeUrl(postUrl));
    return match ? { owned: true, caption: match.caption } : { owned: false };
  }
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").toLowerCase();
}
