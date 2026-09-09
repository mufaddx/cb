import { InstagramStatus, PrismaClient } from "@prisma/client";
import { encryptSecret } from "../../lib/crypto";
import { getInstagramProvider } from "../../services/instagram";
import { NotFoundError } from "../../lib/errors";

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
        accessTokenEncrypted: encryptSecret(result.accessToken),
        tokenExpiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
        status: InstagramStatus.CONNECTED,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
      },
      update: {
        igUserId: result.profile.igUserId,
        username: result.profile.username,
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

export async function getInstagramStatus(prisma: PrismaClient, creatorId: string) {
  const account = await prisma.instagramAccount.findUnique({
    where: { creatorId },
    include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });
  if (!account) {
    return { status: "NOT_CONNECTED" as const };
  }
  return {
    status: account.status,
    username: account.username,
    connectedAt: account.connectedAt,
    lastSyncedAt: account.lastSyncedAt,
    latestMetrics: account.snapshots[0] ?? null,
  };
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
