import type { NextFunction, Request, Response } from "express";
import { anyRoleHasPermission, Permission } from "@antigravity/shared";
import { UnauthenticatedError, UnauthorizedError } from "../lib/errors";

/** Route-level RBAC gate. Combine with resource-level ownership checks
 * inside the controller/service for "_OWN" permissions — this
 * middleware only proves the role is *allowed to try*, not that the
 * specific record belongs to the caller. */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new UnauthenticatedError();
    if (!anyRoleHasPermission(req.auth.roles, permission)) {
      throw new UnauthorizedError(`Missing permission: ${permission}`);
    }
    next();
  };
}

/** Same as `requirePermission`, but passes if the caller has ANY of
 * the listed permissions — for routes a brand (*_OWN) and an admin
 * (*_ALL) both legitimately hit, with ownership itself checked inside
 * the controller/service. */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new UnauthenticatedError();
    if (!permissions.some((p) => anyRoleHasPermission(req.auth!.roles, p))) {
      throw new UnauthorizedError(`Missing permission: one of [${permissions.join(", ")}]`);
    }
    next();
  };
}
