import config from '@/config';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import { NextFunction, Request, Response } from 'express';

interface ErrorResponse {
  success: boolean;
  message: string;
  error?: string;
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new AppError(message, 401);
  }

  const response: ErrorResponse = {
    success: false,
    message: error.message || 'Internal Server Error',
  };

  // Include error details in development
  if (config.server.nodeEnv === 'development') {
    response.error = err.name;
    if (err.stack) {
      response.stack = err.stack;
    }
  }

  res.status(error.statusCode || 500).json(response);
};
