import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission, anyRoleHasPermission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { UnauthorizedError } from "../../lib/errors";
import * as agreementsService from "./agreements.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/assignment/:assignmentId",
  asyncHandler(async (req, res) => {
    // Either an admin (DOCUMENT_READ_ALL, any agreement) or the
    // brand/creator party to it (DOCUMENT_READ_OWN) — ownership for
    // the latter is enforced inside the service.
    const isAdmin = anyRoleHasPermission(req.auth!.roles, Permission.DOCUMENT_READ_ALL);
    if (!isAdmin && !anyRoleHasPermission(req.auth!.roles, Permission.DOCUMENT_READ_OWN)) {
      throw new UnauthorizedError();
    }
    const agreement = await agreementsService.getAgreementForAssignment(
      prisma,
      req.params.assignmentId,
      isAdmin ? undefined : req.auth!.brandId,
      isAdmin ? undefined : req.auth!.creatorId
    );
    sendSuccess(res, agreement);
  })
);

router.post(
  "/assignment/:assignmentId/regenerate",
  requirePermission(Permission.DOCUMENT_READ_ALL),
  asyncHandler(async (req, res) => {
    const agreement = await agreementsService.regenerateAgreement(prisma, req.params.assignmentId);
    sendSuccess(res, agreement, "Agreement regenerated.");
  })
);

export default router;
