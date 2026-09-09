import { ErrorCode } from "@antigravity/shared";

/** Base class for errors that map to a known API error response.
 * Anything NOT an AppError is treated as an unexpected 500 and never
 * has its message/stack sent to the client (spec §61). */
export class AppError extends Error {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super(ErrorCode.UNAUTHENTICATED, message, 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(ErrorCode.UNAUTHORIZED, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(ErrorCode.NOT_FOUND, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicting state", details?: unknown) {
    super(ErrorCode.CONFLICT, message, 409, details);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message: string) {
    super(ErrorCode.INVALID_STATE_TRANSITION, message, 409);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests") {
    super(ErrorCode.RATE_LIMITED, message, 429);
  }
}
