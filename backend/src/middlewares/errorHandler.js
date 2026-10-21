import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for request input';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'DB_VALIDATION_ERROR';
    message = 'Database model validation failed';
    details = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
  }

  // Handle Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_RESOURCE_ID';
    message = `Invalid value for ${err.path}`;
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, {
    code,
    statusCode,
    details,
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
