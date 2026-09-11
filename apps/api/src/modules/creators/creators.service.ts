import { PrismaClient, WalletOwnerType } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../lib/errors";
import type { CreateCreatorInput, UpdateCreatorInput } from "./creators.validation";

export async function createCreatorProfile(prisma: PrismaClient, userId: string, input: CreateCreatorInput) {
  const existing = await prisma.creator.findUnique({ where: { userId } });
  if (existing) throw new ConflictError("A creator profile already exists for this account");

  return prisma.$transaction(async (tx) => {
    const creator = await tx.creator.create({
      data: {
        userId,
        fullName: input.fullName,
        displayName: input.displayName,
        phone: input.phone,
        bio: input.bio,
        location: input.location,
        languages: input.languages as any,
        contentFormats: input.contentFormats as any,
        campaignPreferences: input.campaignPreferences as any,
        onboardingComplete: true,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
    await tx.wallet.create({ data: { ownerType: WalletOwnerType.CREATOR, creatorId: creator.id } });
    return creator;
  });
}

const WITH_CATEGORIES = { categories: { include: { category: true } } } as const;

export async function getMyCreatorProfile(prisma: PrismaClient, userId: string) {
  const creator = await prisma.creator.findUnique({ where: { userId }, include: WITH_CATEGORIES });
  if (!creator) throw new NotFoundError("Creator profile not found");
  return creator;
}

/** Top creators for a brand deciding who to work with — ranked by
 * quality score then completion rate, same ordering matching.service.ts
 * uses to pick who gets an offer first. AVAILABLE only (a paused/busy
 * creator wouldn't be offered anything anyway). */
export async function listTopCreators(prisma: PrismaClient, limit = 20) {
  const creators = await prisma.creator.findMany({
    where: { availability: "AVAILABLE" },
    orderBy: [{ qualityScore: "desc" }, { completionRate: "desc" }],
    take: limit,
    select: {
      id: true,
      displayName: true,
      bio: true,
      location: true,
      qualityScore: true,
      completionRate: true,
      categories: { select: { category: { select: { name: true } } } },
      instagramAccount: {
        select: {
          username: true,
          snapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { followers: true, avgReach: true } },
        },
      },
    },
  });
  return creators.map((c) => ({
    id: c.id,
    displayName: c.displayName,
    bio: c.bio,
    location: c.location,
    qualityScore: c.qualityScore,
    completionRate: c.completionRate,
    categories: c.categories.map((cc) => cc.category.name),
    instagramUsername: c.instagramAccount?.username ?? null,
    followers: c.instagramAccount?.snapshots[0]?.followers ?? null,
    avgReach: c.instagramAccount?.snapshots[0]?.avgReach ?? null,
  }));
}

/**
 * Self-service profile edit — until now categories (and everything
 * else here) could only ever be set once, at signup, and never
 * changed. Matching (see matching.service.ts) already filters by
 * category overlap when a campaign specifies one; this is what
 * actually lets a creator show up in that filter at all.
 */
export async function updateCreatorProfile(prisma: PrismaClient, userId: string, input: UpdateCreatorInput) {
  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) throw new NotFoundError("Creator profile not found");

  return prisma.$transaction(async (tx) => {
    await tx.creator.update({
      where: { id: creator.id },
      data: {
        bio: input.bio,
        location: input.location,
        languages: input.languages as any,
        contentFormats: input.contentFormats as any,
      },
    });

    if (input.categoryIds) {
      await tx.creatorCategory.deleteMany({ where: { creatorId: creator.id } });
      if (input.categoryIds.length > 0) {
        await tx.creatorCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({ creatorId: creator.id, categoryId })),
        });
      }
    }

    return tx.creator.findUniqueOrThrow({ where: { id: creator.id }, include: WITH_CATEGORIES });
  });
}
