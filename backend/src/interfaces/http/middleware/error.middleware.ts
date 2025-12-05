import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error.message);

  let statusCode = 500;

  if (error.message.includes('not found')) {
    statusCode = 404;
  } else if (error.message.includes('Invalid') || error.message.includes('required')) {
    statusCode = 400;
  } else if (error.message.includes('Unauthorized')) {
    statusCode = 401;
  }

  res.status(statusCode).json({
    error: error.message || 'Internal server error',
  });
};
