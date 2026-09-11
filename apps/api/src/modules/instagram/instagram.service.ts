import { InstagramStatus, Prisma, PrismaClient } from "@prisma/client";
import { decryptSecret, encryptSecret } from "../../lib/crypto";
import { getInstagramProvider } from "../../services/instagram";
import { NotFoundError } from "../../lib/errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Connects a creator's Instagram account via the OAuth code-exchange
 * flow (spec §15) — never a password. The resulting access token is
 * AES-256-GCM encrypted before it touches the database.
 */
export async function connectInstagram(prisma: PrismaClient, creatorId: string, code: string) {
  const provider = getInstagramProvider();
  const result = await provider.exchangeCodeForToken(code);

  return prisma.$transaction(async (tx) => {
    const account = await tx.instagramAccount.upsert({
      where: { creatorId },
      create: {
        creatorId,
        igUserId: result.profile.igUserId,
        username: result.profile.username,
        profilePictureUrl: result.profile.profileImageUrl,
        fullName: result.profile.fullName,
        bio: result.profile.bio,
        accessTokenEncrypted: encryptSecret(result.accessToken),
        tokenExpiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
        status: InstagramStatus.CONNECTED,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
      },
      update: {
        igUserId: result.profile.igUserId,
        username: result.profile.username,
        profilePictureUrl: result.profile.profileImageUrl,
        fullName: result.profile.fullName,
        bio: result.profile.bio,
        accessTokenEncrypted: encryptSecret(result.accessToken),
        tokenExpiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
        status: InstagramStatus.CONNECTED,
        lastSyncedAt: new Date(),
      },
    });

    await tx.instagramMetricSnapshot.create({
      data: {
        instagramAccountId: account.id,
        followers: result.profile.followers,
        avgReach: result.profile.avgReach,
        avgViews: result.profile.avgViews,
      },
    });

    return account;
  });
}

export async function getInstagramStatus(prisma: DbClient, creatorId: string) {
  const account = await prisma.instagramAccount.findUnique({
    where: { creatorId },
    include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });
  if (!account) {
    return { status: "NOT_CONNECTED" as const };
  }
  const metrics = account.snapshots[0] ?? null;
  return {
    status: account.status,
    username: account.username,
    fullName: account.fullName,
    bio: account.bio,
    profilePictureUrl: account.profilePictureUrl,
    connectedAt: account.connectedAt,
    lastSyncedAt: account.lastSyncedAt,
    latestMetrics: metrics,
    // Derived, not stored — always consistent with whatever snapshot
    // is actually latest, rather than a separately-stored figure that
    // could drift out of sync with it.
    engagementRatePct: metrics && metrics.followers > 0 && metrics.avgReach != null
      ? Number(((metrics.avgReach / metrics.followers) * 100).toFixed(1))
      : null,
  };
}

/**
 * Manual "Refresh" — re-fetches the profile from the provider and
 * appends a new metric snapshot, rather than mutating the last one
 * (spec pattern: metrics are an append-only history, same reasoning
 * as the wallet ledger). No periodic auto-sync exists yet (see
 * jobs/scheduler.ts) — this is the only way metrics update today.
 */
export async function refreshInstagramMetrics(prisma: PrismaClient, creatorId: string) {
  const account = await prisma.instagramAccount.findUnique({ where: { creatorId } });
  if (!account) throw new NotFoundError("Instagram is not connected for this creator");

  const provider = getInstagramProvider();
  const accessToken = decryptSecret(account.accessTokenEncrypted);
  const profile = await provider.fetchProfile(accessToken, account.igUserId);

  return prisma.$transaction(async (tx) => {
    await tx.instagramAccount.update({
      where: { id: account.id },
      data: {
        username: profile.username,
        profilePictureUrl: profile.profileImageUrl ?? account.profilePictureUrl,
        fullName: profile.fullName ?? account.fullName,
        bio: profile.bio ?? account.bio,
        lastSyncedAt: new Date(),
      },
    });
    await tx.instagramMetricSnapshot.create({
      data: {
        instagramAccountId: account.id,
        followers: profile.followers,
        avgReach: profile.avgReach,
        avgViews: profile.avgViews,
      },
    });
    return getInstagramStatus(tx, creatorId);
  });
}

/**
 * Disconnects a creator's Instagram account. The account row and its
 * metric-snapshot history stay (a brand may have already unlocked/
 * targeted this creator using that data, and matching/audit shouldn't
 * lose it) — only `status` flips to NEEDS_RECONNECTION and the
 * now-unusable access token is overwritten rather than left
 * decryptable at rest. Reconnecting later goes through the normal
 * connect flow, which upserts this same row back to CONNECTED.
 */
export async function disconnectInstagram(prisma: PrismaClient, creatorId: string) {
  const account = await prisma.instagramAccount.findUnique({ where: { creatorId } });
  if (!account) throw new NotFoundError("Instagram is not connected for this creator");

  await prisma.instagramAccount.update({
    where: { id: account.id },
    data: { status: InstagramStatus.NEEDS_RECONNECTION, accessTokenEncrypted: encryptSecret("revoked") },
  });
  return getInstagramStatus(prisma, creatorId);
}

export async function requireLatestFollowerCount(prisma: PrismaClient, creatorId: string): Promise<number> {
  const account = await prisma.instagramAccount.findUnique({
    where: { creatorId },
    include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });
  if (!account || !account.snapshots[0]) {
    throw new NotFoundError("No Instagram metrics available for this creator");
  }
  return account.snapshots[0].followers;
}
