import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthenticated user', undefined, 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'Access denied: You do not have permission to perform this action',
        undefined,
        403
      );
      return;
    }

    next();
  };
};
