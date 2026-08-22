import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../models/prisma';
import { sendError } from '../utils/apiResponse';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  employeeId?: string;
  loginId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authorization token missing or invalid', undefined, 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Authentication token missing', undefined, 401);
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: string;
    };

    // Query user and check status in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { employee: true },
    });

    if (!user) {
      sendError(res, 'User no longer exists', undefined, 401);
      return;
    }

    if (user.status !== 'ACTIVE') {
      sendError(res, `Account is currently ${user.status.toLowerCase()}`, undefined, 403);
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
      loginId: user.employee?.loginId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Invalid or expired authentication token', undefined, 401);
      return;
    }
    sendError(res, 'Authentication error', undefined, 500);
  }
};
