import type { Request, Response } from "express";
import { prisma } from "@antigravity/db";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError, ValidationError } from "../../lib/errors";
import * as campaignsService from "./campaigns.service";
import { CreateCampaignSchema, RejectCampaignSchema } from "./campaigns.validation";
import { getStorageProvider } from "../../services/storage";

function requireBrandId(req: Request): string {
  if (!req.auth?.brandId) throw new UnauthorizedError("This action requires a brand profile");
  return req.auth.brandId;
}

export async function createCampaignHandler(req: Request, res: Response) {
  const brandId = requireBrandId(req);
  const input = CreateCampaignSchema.parse(req.body);
  const campaign = await campaignsService.createDraftCampaign(prisma, brandId, req.auth!.sub, input);
  sendSuccess(res, campaign, "Campaign draft created.", 201);
}

export async function listMyCampaignsHandler(req: Request, res: Response) {
  const brandId = requireBrandId(req);
  const campaigns = await campaignsService.listCampaignsForBrand(prisma, brandId);
  sendSuccess(res, campaigns);
}

export async function getCampaignHandler(req: Request, res: Response) {
  // An admin (CAMPAIGN_READ_ALL) can view any campaign; a brand
  // (CAMPAIGN_READ_OWN) only its own — both permissions gate this
  // same route (see campaigns.routes.ts), so branch on which one
  // actually applies to this caller.
  if (req.auth?.brandId) {
    const campaign = await campaignsService.getCampaignForBrand(prisma, req.params.id, req.auth.brandId);
    sendSuccess(res, campaign);
    return;
  }
  const campaign = await campaignsService.getCampaignForAdmin(prisma, req.params.id);
  sendSuccess(res, campaign);
}

export async function getCampaignReviewQueueHandler(_req: Request, res: Response) {
  const queue = await campaignsService.listCampaignReviewQueue(prisma);
  sendSuccess(res, queue);
}

export async function getCampaignOffersHandler(req: Request, res: Response) {
  const brandId = requireBrandId(req);
  // Ownership check happens inside — reuses the same guard as
  // getCampaignForBrand so a brand can't enumerate another brand's offers.
  await campaignsService.getCampaignForBrand(prisma, req.params.id, brandId);
  const offers = await prisma.campaignOffer.findMany({
    where: { campaignId: req.params.id },
    include: { creator: true, slab: true },
    orderBy: { offeredAt: "desc" },
  });
  sendSuccess(res, offers);
}

export async function getCampaignSourceAssetHandler(req: Request, res: Response) {
  const key = await campaignsService.getCampaignSourceAssetKey(prisma, req.params.id, {
    brandId: req.auth?.brandId,
    creatorId: req.auth?.creatorId,
  });
  const url = await getStorageProvider().getSignedDownloadUrl(key);
  sendSuccess(res, { url });
}

export async function submitCampaignHandler(req: Request, res: Response) {
  const brandId = requireBrandId(req);
  const campaign = await campaignsService.submitCampaign(prisma, req.params.id, brandId, req.auth!.sub);
  sendSuccess(res, campaign, "Campaign submitted for review.");
}

export async function cancelCampaignHandler(req: Request, res: Response) {
  const brandId = requireBrandId(req);
  const campaign = await campaignsService.cancelCampaign(prisma, req.params.id, brandId, req.auth!.sub);
  sendSuccess(res, campaign, "Campaign cancelled.");
}

export async function approveCampaignHandler(req: Request, res: Response) {
  const campaign = await campaignsService.approveCampaign(prisma, req.params.id, req.auth!.sub);
  sendSuccess(res, campaign, "Campaign approved. Awaiting brand payment.");
}

export async function rejectCampaignHandler(req: Request, res: Response) {
  const { reason } = RejectCampaignSchema.parse(req.body);
  const campaign = await campaignsService.rejectCampaign(prisma, req.params.id, req.auth!.sub, reason);
  sendSuccess(res, campaign, "Campaign rejected.");
}
