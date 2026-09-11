import { Router } from "express";
import { z } from "zod";
import { Permission } from "@antigravity/shared";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import { getInstagramProvider } from "../../services/instagram";
import * as instagramService from "./instagram.service";

const router = Router();
router.use(requireAuth, requirePermission(Permission.INSTAGRAM_MANAGE_OWN));

function requireCreatorId(req: { auth?: { creatorId?: string } }): string {
  if (!req.auth?.creatorId) throw new UnauthorizedError("This action requires a creator profile");
  return req.auth.creatorId;
}

router.get(
  "/authorize-url",
  asyncHandler(async (req, res) => {
    const creatorId = requireCreatorId(req);
    const url = getInstagramProvider().getAuthorizationUrl(creatorId);
    sendSuccess(res, { url });
  })
);

const ConnectSchema = z.object({ code: z.string().min(1) });

router.post(
  "/connect",
  asyncHandler(async (req, res) => {
    const creatorId = requireCreatorId(req);
    const { code } = ConnectSchema.parse(req.body);
    const account = await instagramService.connectInstagram(prisma, creatorId, code);
    sendSuccess(res, account, "Instagram connected.");
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const creatorId = requireCreatorId(req);
    const status = await instagramService.getInstagramStatus(prisma, creatorId);
    sendSuccess(res, status);
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const creatorId = requireCreatorId(req);
    const status = await instagramService.refreshInstagramMetrics(prisma, creatorId);
    sendSuccess(res, status, "Instagram metrics refreshed.");
  })
);

router.post(
  "/disconnect",
  asyncHandler(async (req, res) => {
    const creatorId = requireCreatorId(req);
    const status = await instagramService.disconnectInstagram(prisma, creatorId);
    sendSuccess(res, status, "Instagram disconnected.");
  })
);

export default router;
