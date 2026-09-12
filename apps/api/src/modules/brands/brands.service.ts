import { PrismaClient, WalletOwnerType } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../lib/errors";
import type { CreateBrandInput, UpdateBrandInput } from "./brands.validation";

export async function createBrandProfile(prisma: PrismaClient, userId: string, input: CreateBrandInput) {
  const existing = await prisma.brand.findUnique({ where: { userId } });
  if (existing) throw new ConflictError("A brand profile already exists for this account");

  return prisma.$transaction(async (tx) => {
    const brand = await tx.brand.create({
      data: {
        userId,
        companyName: input.companyName,
        contactPerson: input.contactPerson,
        phone: input.phone,
        website: input.website,
        industry: input.industry,
        billingAddress: input.billingAddress as any,
        gstin: input.gstin,
        description: input.description,
        onboardingComplete: true,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
    await tx.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
    return brand;
  });
}

/** Settings → Account, for a brand: the only field exposed for
 * self-edit there is companyName — everything else on Brand (GSTIN,
 * billing address, industry) is invoice/compliance data that isn't
 * part of this redesign's scope. */
export async function updateBrandProfile(prisma: PrismaClient, userId: string, input: UpdateBrandInput) {
  const brand = await prisma.brand.findUnique({ where: { userId } });
  if (!brand) throw new NotFoundError("Brand profile not found");
  return prisma.brand.update({ where: { id: brand.id }, data: { companyName: input.companyName } });
}
