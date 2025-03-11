import { ErrorRequestHandler, RequestHandler, CustomError } from '../types/index.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Something went wrong!';

  res.status(status).json({
    success: false,
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: 'Resource not found'
  });
}; 