import { Router } from "express";
import { prisma } from "@antigravity/db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === "true";
    const notifications = await prisma.notification.findMany({
      where: { userId: req.auth!.sub, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    sendSuccess(res, notifications);
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    // Always computed live from the table — never a stale cached
    // counter (spec §78: "Counts must be calculated from actual
    // database state").
    const count = await prisma.notification.count({ where: { userId: req.auth!.sub, readAt: null } });
    sendSuccess(res, { count });
  })
);

router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) throw new NotFoundError("Notification not found");
    if (notification.userId !== req.auth!.sub) throw new UnauthorizedError();
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: notification.readAt ?? new Date() },
    });
    sendSuccess(res, updated);
  })
);

router.post(
  "/mark-all-read",
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.auth!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    sendSuccess(res, { updated: result.count });
  })
);

export default router;
