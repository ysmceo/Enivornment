const mongoose = require('mongoose');

const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID.';
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value conflict.';
  }

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((validationError) => validationError.message)
      .join(', ');
  }

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred.'
      : message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
