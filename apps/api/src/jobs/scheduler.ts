import { prisma } from "@antigravity/db";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { runDueRetentionChecks } from "../modules/retention/retention.service";
import { expireStaleOffers } from "../modules/offers/offers.service";

/**
 * In-process interval scheduler for the jobs spec §79 calls out
 * (offer expiry, retention checks; Instagram metric sync and payment
 * reconciliation are not implemented yet). This is deliberately NOT
 * BullMQ/Redis-backed — it's the simplest thing that actually runs
 * the existing idempotent service functions on a timer for a
 * single-instance deployment (the Hostinger target in spec §94).
 *
 * THIS DOES NOT SCALE TO MULTIPLE INSTANCES: every replica would run
 * every job redundantly (wastefully, not incorrectly — the functions
 * are idempotent — but redundantly). Before deploying more than one
 * API instance, replace this with BullMQ against REDIS_URL (already
 * in `.env.example`) using a proper distributed lock/leader-election,
 * or a platform cron hitting the same service functions directly.
 *
 * Every tick logs its result so a human can see the job actually ran,
 * not just that it was scheduled.
 */

let timers: NodeJS.Timeout[] = [];

export function startBackgroundJobs(): void {
  if (!env.ENABLE_BACKGROUND_JOBS) {
    logger.info("Background jobs disabled (ENABLE_BACKGROUND_JOBS=false)");
    return;
  }
  if (timers.length > 0) {
    logger.warn("startBackgroundJobs called more than once — ignoring");
    return;
  }

  const retentionMs = env.RETENTION_JOB_INTERVAL_MINUTES * 60_000;
  const offerExpiryMs = env.OFFER_EXPIRY_JOB_INTERVAL_MINUTES * 60_000;

  const retentionTimer = setInterval(async () => {
    try {
      const results = await runDueRetentionChecks(prisma);
      if (results.length > 0) {
        logger.info({ count: results.length, results }, "[job] retention check run");
      }
    } catch (err) {
      logger.error({ err }, "[job] retention check run failed");
    }
  }, retentionMs);

  const offerExpiryTimer = setInterval(async () => {
    try {
      const { expired } = await expireStaleOffers(prisma);
      if (expired > 0) {
        logger.info({ expired }, "[job] offer expiry run");
      }
    } catch (err) {
      logger.error({ err }, "[job] offer expiry run failed");
    }
  }, offerExpiryMs);

  // Node keeps the process alive while these are pending; unref so a
  // graceful shutdown (SIGTERM handler in server.ts) isn't blocked by them.
  retentionTimer.unref?.();
  offerExpiryTimer.unref?.();
  timers = [retentionTimer, offerExpiryTimer];

  logger.info(
    { retentionMinutes: env.RETENTION_JOB_INTERVAL_MINUTES, offerExpiryMinutes: env.OFFER_EXPIRY_JOB_INTERVAL_MINUTES },
    "Background jobs started"
  );
}

export function stopBackgroundJobs(): void {
  for (const t of timers) clearInterval(t);
  timers = [];
}
