import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ErrorCode, InvalidTransitionError } from "@antigravity/shared";
import { AppError } from "../lib/errors";
import { sendError } from "../lib/apiResponse";
import { logger } from "../lib/logger";

/** Central error handler. Never leaks a stack trace or raw error
 * message for unexpected failures (spec §61) — those become a generic
 * 500 while the real detail goes only to the server log. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.errorCode, err.message, err.statusCode, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, ErrorCode.VALIDATION_ERROR, "Validation failed", 400, err.flatten());
    return;
  }

  // A rejected state-machine transition (packages/shared/src/states.ts)
  // is an expected, client-facing conflict (e.g. double-submitting a
  // webhook after a campaign already moved on) — not a server fault.
  if (err instanceof InvalidTransitionError) {
    sendError(res, ErrorCode.INVALID_STATE_TRANSITION, err.message, 409);
    return;
  }

  logger.error({ err, requestId: req.appRequestId, path: req.path }, "Unhandled error");
  sendError(res, ErrorCode.INTERNAL_ERROR, "Something went wrong. Please try again.", 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, ErrorCode.NOT_FOUND, `Route not found: ${req.method} ${req.path}`, 404);
}
