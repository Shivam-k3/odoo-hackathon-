import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class AuthController {
  /**
   * POST /api/auth/signup
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signup(req.body);
      sendSuccess(res, 'User registered successfully', result, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loginIdentifier, password } = req.body;
      const result = await authService.login(loginIdentifier, password);
      sendSuccess(res, 'Authentication successful', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', undefined, 401);
        return;
      }
      const user = await authService.getMe(req.user.id);
      sendSuccess(res, 'Current user profile retrieved', user, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    // JWT is stateless; client removes token. Invalidate / confirm logout response
    sendSuccess(res, 'Logged out successfully', { loggedOut: true }, 200);
  }
}

export const authController = new AuthController();
