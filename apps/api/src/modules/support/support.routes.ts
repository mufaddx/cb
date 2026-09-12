import { Router } from "express";
import { prisma } from "@antigravity/db";
import { Permission } from "@antigravity/shared";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess } from "../../lib/apiResponse";
import { AddMessageSchema, CreateTicketSchema, UpdateTicketStatusSchema } from "./support.validation";
import * as supportService from "./support.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/tickets",
  requirePermission(Permission.SUPPORT_TICKET_CREATE_OWN),
  asyncHandler(async (req, res) => {
    const input = CreateTicketSchema.parse(req.body);
    const ticket = await supportService.createTicket(prisma, req.auth!.sub, input);
    sendSuccess(res, ticket, "Ticket submitted — we'll get back to you here.", 201);
  })
);

router.get(
  "/tickets",
  requirePermission(Permission.SUPPORT_TICKET_CREATE_OWN),
  asyncHandler(async (req, res) => {
    const tickets = await supportService.listMyTickets(prisma, req.auth!.sub);
    sendSuccess(res, tickets);
  })
);

// MUST be registered before "/tickets/:id" for the same reason
// disputes/withdrawals do this — Express would otherwise match "/queue"
// as an :id value.
router.get(
  "/tickets/queue",
  requirePermission(Permission.SUPPORT_TICKET_MANAGE_ALL),
  asyncHandler(async (_req, res) => {
    const tickets = await supportService.listAllTickets(prisma);
    sendSuccess(res, tickets);
  })
);

router.get(
  "/tickets/:id",
  requirePermission(Permission.SUPPORT_TICKET_CREATE_OWN),
  asyncHandler(async (req, res) => {
    const ticket = await supportService.getMyTicket(prisma, req.auth!.sub, req.params.id);
    sendSuccess(res, ticket);
  })
);

router.post(
  "/tickets/:id/messages",
  requirePermission(Permission.SUPPORT_TICKET_CREATE_OWN),
  asyncHandler(async (req, res) => {
    const input = AddMessageSchema.parse(req.body);
    const message = await supportService.addUserMessage(prisma, req.auth!.sub, req.params.id, input.body);
    sendSuccess(res, message, "Message sent.", 201);
  })
);

router.get(
  "/tickets/:id/admin",
  requirePermission(Permission.SUPPORT_TICKET_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const ticket = await supportService.getTicketForAdmin(prisma, req.params.id);
    sendSuccess(res, ticket);
  })
);

router.post(
  "/tickets/:id/admin/messages",
  requirePermission(Permission.SUPPORT_TICKET_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const input = AddMessageSchema.parse(req.body);
    const message = await supportService.addAdminMessage(prisma, req.auth!.sub, req.params.id, input.body);
    sendSuccess(res, message, "Reply sent.", 201);
  })
);

router.patch(
  "/tickets/:id/status",
  requirePermission(Permission.SUPPORT_TICKET_MANAGE_ALL),
  asyncHandler(async (req, res) => {
    const input = UpdateTicketStatusSchema.parse(req.body);
    const ticket = await supportService.updateTicketStatus(prisma, req.params.id, input.status);
    sendSuccess(res, ticket, "Status updated.");
  })
);

export default router;
