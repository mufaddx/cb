import type {
  ExchangeCodeResult,
  InstagramProfile,
  InstagramProvider,
} from "./InstagramProvider";
import { env } from "../../config/env";

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
      `${this.graphBase}/me?fields=id,username,profile_picture_url,followers_count&access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Instagram profile fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      id: string;
      username: string;
      profile_picture_url?: string;
      followers_count: number;
    };

    // Average reach/views require the Insights API against recent
    // media and are computed by the metric-sync background job
    // (jobs/syncInstagramMetrics), not on every profile fetch.
    return {
      igUserId: data.id || igUserId,
      username: data.username,
      profileImageUrl: data.profile_picture_url,
      followers: data.followers_count,
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
