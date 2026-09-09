import { PrismaClient, WalletOwnerType } from "@prisma/client";
import { ConflictError } from "../../lib/errors";
import type { CreateCreatorInput } from "./creators.validation";

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
