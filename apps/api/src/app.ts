import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./lib/logger";
import { requestId } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { optionalAuth } from "./middleware/auth";
import { sendSuccess } from "./lib/apiResponse";

import authRoutes from "./modules/auth/auth.routes";
import brandsRoutes from "./modules/brands/brands.routes";
import creatorsRoutes from "./modules/creators/creators.routes";
import campaignsRoutes from "./modules/campaigns/campaigns.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import documentsRoutes from "./modules/documents/documents.routes";
import { paymentsRouter, paymentsWebhookRouter } from "./modules/payments/payments.routes";
import instagramRoutes from "./modules/instagram/instagram.routes";
import matchingRoutes from "./modules/matching/matching.routes";
import offersRoutes from "./modules/offers/offers.routes";
import assignmentsRoutes from "./modules/assignments/assignments.routes";
import verificationRoutes from "./modules/verification/verification.routes";
import retentionRoutes from "./modules/retention/retention.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";
import kycRoutes from "./modules/kyc/kyc.routes";
import withdrawalsRoutes from "./modules/withdrawals/withdrawals.routes";
import productsRoutes from "./modules/products/products.routes";
import shippingRoutes from "./modules/shipping/shipping.routes";
import refundsRoutes from "./modules/refunds/refunds.routes";
import disputesRoutes from "./modules/disputes/disputes.routes";
import contentRoutes from "./modules/content/content.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import messagesRoutes from "./modules/messages/messages.routes";
import fraudRoutes from "./modules/fraud/fraud.routes";
import agreementsRoutes from "./modules/agreements/agreements.routes";
import adminRoutes from "./modules/admin/admin.routes";
import categoriesRoutes from "./modules/categories/categories.routes";

export function createApp() {
  const app = express();

  // Behind a reverse proxy (Apache/Passenger on Hostinger, or any other
  // proxy in front of this app) in production/staging — trust the first
  // hop's X-Forwarded-* headers so req.ip and express-rate-limit's IP
  // key generator see the real client IP instead of the proxy's own.
  // Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  // on every request once X-Forwarded-For is present, crashing with 500s.
  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") {
    app.set("trust proxy", 1);
  }

  app.use(requestId);
  app.use(pinoHttp({ logger, customLogLevel: () => "debug" }));
  app.use(helmet());
  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true,
    })
  );
  app.use(cookieParser());

  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  app.get("/health", (req, res) => sendSuccess(res, { status: "ok", env: env.NODE_ENV }));

  // Webhook routes need the RAW request body for signature
  // verification, so they're mounted before express.json().
  app.use("/api/payments", paymentsWebhookRouter);

  app.use(express.json({ limit: "10mb" }));
  app.use(optionalAuth);

  app.use("/api/auth", authRoutes);
  app.use("/api/brands", brandsRoutes);
  app.use("/api/creators", creatorsRoutes);
  app.use("/api/campaigns", campaignsRoutes);
  app.use("/api/campaigns", matchingRoutes);
  app.use("/api/campaign-offers", offersRoutes);
  app.use("/api/assignments", assignmentsRoutes);
  app.use("/api/verifications", verificationRoutes);
  app.use("/api/retention", retentionRoutes);
  app.use("/api/instagram", instagramRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/documents", documentsRoutes);
  app.use("/api/uploads", uploadsRoutes);
  app.use("/api/kyc", kycRoutes);
  app.use("/api/withdrawals", withdrawalsRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/shipments", shippingRoutes);
  app.use("/api/payments", refundsRoutes);
  app.use("/api/disputes", disputesRoutes);
  app.use("/api/content", contentRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/fraud", fraudRoutes);
  app.use("/api/agreements", agreementsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/categories", categoriesRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
