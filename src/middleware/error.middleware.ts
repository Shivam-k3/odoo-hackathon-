import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Never expose sensitive server internals, stack traces, or DB internals
  console.error('Unhandled Application Error:', err);

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    sendError(res, 'Unauthorized access', undefined, 401);
    return;
  }

  if (err.code === 'P2002') {
    // Prisma unique constraint violation
    const target = (err.meta?.target as string[]) || ['field'];
    sendError(
      res,
      `A record with this ${target.join(', ')} already exists`,
      undefined,
      409
    );
    return;
  }

  if (err.code === 'P2025') {
    // Prisma record not found
    sendError(res, 'Requested resource was not found', undefined, 404);
    return;
  }

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error';

  sendError(res, message, undefined, err.statusCode || 500);
};
