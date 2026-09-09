/** Standard API envelope (spec §61). Every endpoint returns one of these. */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  requestId: string;
}

export interface ApiError {
  success: false;
  errorCode: string;
  message: string;
  details?: unknown;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
