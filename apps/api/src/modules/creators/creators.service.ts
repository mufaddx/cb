import { PrismaClient, TargetingMetric, WalletOwnerType } from "@prisma/client";
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

/** Distinct follower/reach bands a brand can pick from on the Top
 * Creators filter — sourced from the same admin-managed PricingSlab
 * rate card that drives Create Campaign's targeting picker (see
 * campaigns.controller.ts::getPricingSlabsHandler), so an admin
 * controls both from one place instead of two. Deduped across every
 * campaign type, since this filter isn't scoped to one — a range an
 * admin sets for any campaign type shows up here once. */
export async function getFollowerRanges(prisma: PrismaClient, metric: TargetingMetric) {
  const slabs = await prisma.pricingSlab.findMany({
    where: { metric, active: true },
    orderBy: { minValue: "asc" },
    select: { minValue: true, maxValue: true },
  });
  const seen = new Set<string>();
  const ranges: Array<{ minValue: number; maxValue: number | null }> = [];
  for (const s of slabs) {
    const key = `${s.minValue}-${s.maxValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ranges.push(s);
  }
  return ranges;
}

export interface TopCreatorsFilter {
  categoryId?: string;
  metric?: "FOLLOWER_COUNT" | "AVERAGE_REACH";
  minValue?: number;
  maxValue?: number;
}

/** Top creators for a brand deciding who to work with — ranked by
 * quality score then completion rate, same ordering matching.service.ts
 * uses to pick who gets an offer first. AVAILABLE only (a paused/busy
 * creator wouldn't be offered anything anyway).
 *
 * Identity (display name, Instagram handle) is masked unless this
 * brand has already spent a credit unlocking that specific creator
 * (see unlockCreatorProfile) — follower/reach/category/quality data
 * stays visible either way, since that's what a brand needs to decide
 * WHETHER to spend a credit in the first place. */
export async function listTopCreators(prisma: PrismaClient, brandId: string, filter: TopCreatorsFilter = {}, limit = 50) {
  const [creators, unlocks] = await Promise.all([
    prisma.creator.findMany({
      where: {
        availability: "AVAILABLE",
        ...(filter.categoryId ? { categories: { some: { categoryId: filter.categoryId } } } : {}),
      },
      orderBy: [{ qualityScore: "desc" }, { completionRate: "desc" }],
      take: 200, // over-fetch — the follower/reach range filter below runs in memory (same pattern as matching.service.ts)
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
            profilePictureUrl: true,
            snapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { followers: true, avgReach: true } },
          },
        },
      },
    }),
    prisma.profileUnlock.findMany({ where: { brandId }, select: { creatorId: true } }),
  ]);
  const unlockedIds = new Set(unlocks.map((u) => u.creatorId));

  const rows = creators
    .map((c) => {
      const snapshot = c.instagramAccount?.snapshots[0];
      return {
        id: c.id,
        bio: c.bio,
        location: c.location,
        qualityScore: c.qualityScore,
        completionRate: c.completionRate,
        categories: c.categories.map((cc) => cc.category.name),
        followers: snapshot?.followers ?? null,
        avgReach: snapshot?.avgReach ?? null,
        unlocked: unlockedIds.has(c.id),
        displayName: unlockedIds.has(c.id) ? c.displayName : `Creator #${c.id.slice(-5).toUpperCase()}`,
        instagramUsername: unlockedIds.has(c.id) ? c.instagramAccount?.username ?? null : null,
        profilePictureUrl: unlockedIds.has(c.id) ? c.instagramAccount?.profilePictureUrl ?? null : null,
      };
    })
    .filter((c) => {
      if (!filter.metric) return true;
      const value = filter.metric === "FOLLOWER_COUNT" ? c.followers : c.avgReach;
      if (value == null) return false;
      if (filter.minValue != null && value < filter.minValue) return false;
      if (filter.maxValue != null && value > filter.maxValue) return false;
      return true;
    });

  return rows.slice(0, limit);
}

/**
 * Spends one credit to permanently reveal a creator's real identity to
 * this brand — idempotent (unlocking an already-unlocked creator is a
 * no-op, never double-charges) and atomic (credit debit + the unlock
 * record are one transaction, so a crash between them can't produce
 * "charged but never unlocked").
 */
export async function unlockCreatorProfile(prisma: PrismaClient, brandId: string, creatorId: string) {
  const existing = await prisma.profileUnlock.findUnique({ where: { brandId_creatorId: { brandId, creatorId } } });
  if (existing) return { alreadyUnlocked: true };

  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  if (!creator) throw new NotFoundError("Creator not found");

  return prisma.$transaction(async (tx) => {
    const brand = await tx.brand.findUniqueOrThrow({ where: { id: brandId } });
    if (brand.profileViewCredits < 1) {
      throw new ConflictError("No profile-view credits left — buy a credit pack to unlock more profiles.");
    }
    await tx.brand.update({ where: { id: brandId }, data: { profileViewCredits: { decrement: 1 } } });
    await tx.profileUnlock.create({ data: { brandId, creatorId } });
    return { alreadyUnlocked: false };
  });
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
