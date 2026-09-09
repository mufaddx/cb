import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

// Named `appRequestId` (not `id`) to avoid colliding with pino-http's
// own `Express.Request.id` type augmentation (typed as string|number).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appRequestId: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  req.appRequestId = incoming && incoming.length <= 100 ? incoming : uuidv4();
  res.setHeader("x-request-id", req.appRequestId);
  next();
}
