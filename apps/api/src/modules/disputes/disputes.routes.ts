import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission, anyRoleHasPermission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import { DecideDisputeSchema, OpenDisputeSchema } from "./disputes.validation";
import * as disputesService from "./disputes.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/campaigns/:campaignId",
  requirePermission(Permission.DISPUTE_CREATE_OWN),
  asyncHandler(async (req, res) => {
    const input = OpenDisputeSchema.parse(req.body);
    const role = req.auth!.brandId ? "BRAND" : "CREATOR";
    const actorId = req.auth!.brandId ? req.auth!.brandId : req.auth!.creatorId;
    if (!actorId) throw new UnauthorizedError("This action requires a brand or creator profile");
    const dispute = await disputesService.openDispute(prisma, req.params.campaignId, actorId, role, input);
    sendSuccess(res, dispute, "Dispute opened.", 201);
  })
);

// MUST be registered before "/:id" — Express matches path patterns in
// order, and ":id" would otherwise swallow "/queue" as an id value.
router.get(
  "/queue",
  requirePermission(Permission.DISPUTE_MANAGE_ALL),
  asyncHandler(async (_req, res) => {
    const queue = await disputesService.listDisputeQueue(prisma);
    sendSuccess(res, queue);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    // An admin (DISPUTE_MANAGE_ALL) can view any dispute; a brand or
    // creator (DISPUTE_CREATE_OWN) only one they're a party to —
    // ownership is checked inside the service.
    const isAdmin = anyRoleHasPermission(req.auth!.roles, Permission.DISPUTE_MANAGE_ALL);
    if (!isAdmin && !anyRoleHasPermission(req.auth!.roles, Permission.DISPUTE_CREATE_OWN)) {
      throw new UnauthorizedError();
    }
    const dispute = await disputesService.getDisputeForParty(
      prisma,
      req.params.id,
      isAdmin ? undefined : req.auth!.brandId,
      isAdmin ? undefined : req.auth!.creatorId
    );
    sendSuccess(res, dispute);
  })
);

router.post(
  "/:id/request-evidence",
  requirePermission(Permission.DISPUTE_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const dispute = await disputesService.requestEvidence(prisma, req.params.id, req.auth!.sub);
    sendSuccess(res, dispute, "Evidence requested.");
  })
);

router.post(
  "/:id/decide",
  requirePermission(Permission.DISPUTE_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const { decision } = DecideDisputeSchema.parse(req.body);
    const dispute = await disputesService.decideDispute(prisma, req.params.id, req.auth!.sub, decision);
    sendSuccess(res, dispute, "Dispute resolved.");
  })
);

export default router;
