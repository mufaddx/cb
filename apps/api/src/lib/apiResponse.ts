import type { Response } from "express";
import type { ApiSuccess, ApiError } from "@antigravity/shared";

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    message,
    requestId: res.req.appRequestId,
  };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  errorCode: string,
  message: string,
  statusCode: number,
  details?: unknown
): void {
  const body: ApiError = {
    success: false,
    errorCode,
    message,
    details,
    requestId: res.req.appRequestId,
  };
  res.status(statusCode).json(body);
}
