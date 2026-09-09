import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import { CreateProductSchema, UpdateProductSchema } from "./products.validation";

const router = Router();
router.use(requireAuth, requirePermission(Permission.PRODUCT_MANAGE_OWN));

function requireBrandId(req: { auth?: { brandId?: string } }): string {
  if (!req.auth?.brandId) throw new UnauthorizedError("This action requires a brand profile");
  return req.auth.brandId;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const brandId = requireBrandId(req);
    const input = CreateProductSchema.parse(req.body);
    const product = await prisma.product.create({ data: { brandId, ...input } as any });
    sendSuccess(res, product, "Product created.", 201);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const brandId = requireBrandId(req);
    const products = await prisma.product.findMany({ where: { brandId, archived: false }, orderBy: { createdAt: "desc" } });
    sendSuccess(res, products);
  })
);

async function loadOwnedProduct(brandId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError("Product not found");
  if (product.brandId !== brandId) throw new UnauthorizedError();
  return product;
}

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await loadOwnedProduct(requireBrandId(req), req.params.id);
    sendSuccess(res, product);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const brandId = requireBrandId(req);
    await loadOwnedProduct(brandId, req.params.id);
    const input = UpdateProductSchema.parse(req.body);
    const product = await prisma.product.update({ where: { id: req.params.id }, data: input as any });
    sendSuccess(res, product, "Product updated.");
  })
);

router.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const brandId = requireBrandId(req);
    await loadOwnedProduct(brandId, req.params.id);
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { archived: true } });
    sendSuccess(res, product, "Product archived.");
  })
);

export default router;
