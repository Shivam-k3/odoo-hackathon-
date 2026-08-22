import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, any> | string[];
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): Response => {
  const responseBody: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(responseBody);
};

export const sendError = (
  res: Response,
  message: string,
  errors?: Record<string, any> | string[],
  statusCode = 400
): Response => {
  const responseBody: ApiResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };
  return res.status(statusCode).json(responseBody);
};
