import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@antigravity/shared";
import { env } from "../config/env";
import { UnauthenticatedError } from "../lib/errors";

export interface AccessTokenPayload {
  sub: string; // user id
  roles: Role[];
  brandId?: string;
  creatorId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

// @types/jsonwebtoken types `expiresIn` as a branded "StringValue"
// template-literal type, not a plain string — our TTLs come from
// validated-but-plain-string env vars, so the cast is safe here.
type ExpiresIn = jwt.SignOptions["expiresIn"];

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL as ExpiresIn });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as ExpiresIn,
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (decoded.type !== "refresh" || typeof decoded.sub !== "string") {
    throw new UnauthenticatedError("Invalid refresh token");
  }
  return { sub: decoded.sub };
}

/** Populates req.auth from a valid Bearer token; does not require one. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const token = header.slice("Bearer ".length);
    req.auth = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    // Invalid/expired token on an optional route is treated as anonymous.
  }
  next();
}

/** Requires a valid Bearer access token; rejects otherwise. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthenticatedError();
  }

  try {
    const token = header.slice("Bearer ".length);
    req.auth = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthenticatedError("Invalid or expired access token");
  }
  next();
}
