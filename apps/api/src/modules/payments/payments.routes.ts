import { Router } from "express";
import express from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { Permission } from "@antigravity/shared";
import * as controller from "./payments.controller";

/**
 * Mounted BEFORE the global express.json() body parser (see app.ts) —
 * webhook signature verification must run against the exact raw bytes
 * the provider sent, not a re-serialized JSON object.
 */
export const paymentsWebhookRouter = Router();
paymentsWebhookRouter.post(
  "/webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  asyncHandler(controller.webhookHandler)
);

/** Normal JSON routes, mounted after the global body parser. */
export const paymentsRouter = Router();
paymentsRouter.post(
  "/campaigns/:campaignId/pay",
  requireAuth,
  requirePermission(Permission.CAMPAIGN_READ_OWN),
  asyncHandler(controller.initiatePaymentHandler)
);
paymentsRouter.post(
  "/wallet/topup",
  requireAuth,
  requirePermission(Permission.WALLET_READ_OWN),
  asyncHandler(controller.initiateWalletTopupHandler)
);
paymentsRouter.post("/dev/simulate-webhook", asyncHandler(controller.devSimulateWebhookHandler));
paymentsRouter.get(
  "/admin",
  requireAuth,
  requirePermission(Permission.PAYMENT_MANAGE_ALL),
  asyncHandler(controller.listPaymentsHandler)
);
