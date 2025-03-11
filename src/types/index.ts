import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
}

export type ErrorRequestHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export interface HealthResponse {
  success: boolean;
  message: string;
  database?: string;
  error?: string;
  timestamp: string;
} 