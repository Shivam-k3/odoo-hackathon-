import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          formattedErrors[field || 'error'] = err.message;
        });
        sendError(res, 'Validation failed', formattedErrors, 400);
        return;
      }
      sendError(res, 'Invalid request data', undefined, 400);
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          formattedErrors[field || 'error'] = err.message;
        });
        sendError(res, 'Invalid query parameters', formattedErrors, 400);
        return;
      }
      sendError(res, 'Invalid query parameters', undefined, 400);
    }
  };
};
