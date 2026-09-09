import { Router } from "express";
import { promises as fs } from "fs";
import { z } from "zod";
import { prisma } from "@antigravity/db";
import { Permission, Role, anyRoleHasPermission } from "@antigravity/shared";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthenticatedError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { LocalStorageProvider, getStorageProvider } from "../../services/storage";
import * as documentsService from "./documents.service";

const router = Router();

async function assertCampaignAccess(req: { auth?: { roles: Role[]; brandId?: string } }, campaignId: string) {
  const isAdmin = req.auth?.roles && anyRoleHasPermission(req.auth.roles, Permission.DOCUMENT_READ_ALL);
  if (isAdmin) return;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError("Campaign not found");
  if (!req.auth?.brandId || campaign.brandId !== req.auth.brandId) throw new UnauthorizedError();
}

router.get(
  "/campaigns/:campaignId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertCampaignAccess(req, req.params.campaignId);
    const documents = await documentsService.listDocumentsForCampaign(prisma, req.params.campaignId);
    sendSuccess(res, documents);
  })
);

router.get(
  "/campaigns/:campaignId/evidence-pack",
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertCampaignAccess(req, req.params.campaignId);
    const pack = await documentsService.generateEvidencePack(prisma, req.params.campaignId);
    sendSuccess(res, pack);
  })
);

const QuerySchema = z.object({
  key: z.string().min(1),
  expires: z.coerce.number(),
  sig: z.string().min(1),
});

/**
 * Serves objects for the dev-only LocalStorageProvider using the same
 * signed-expiring-URL contract R2 provides in production — so no
 * calling code needs to know which provider is active (spec §62).
 * This route only exists/works when STORAGE_PROVIDER=local.
 */
router.get(
  "/local-download",
  asyncHandler(async (req, res) => {
    if (env.STORAGE_PROVIDER !== "local") {
      throw new NotFoundError();
    }
    const { key, expires, sig } = QuerySchema.parse(req.query);
    const provider = getStorageProvider() as LocalStorageProvider;
    if (!provider.verifySignature(key, expires, sig)) {
      throw new UnauthenticatedError("Signed URL is invalid or has expired");
    }
    const filePath = provider.resolvePath(key);
    const data = await fs.readFile(filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
    res.send(data);
  })
);

export default router;
