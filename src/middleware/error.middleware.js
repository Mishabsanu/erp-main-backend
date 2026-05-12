import mongoose from "mongoose";
import { errorResponse } from "../utils/response.js";
import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  
  logger.error(`Error caught: ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
  });

  let message = err.message || "Internal Server Error";
  let statusCode = err.statusCode || 500;

  // Handle Mongoose Validation Errors
  if (err instanceof mongoose.Error.ValidationError) {
    message = "Validation failed";
    const errors = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, message, 422, errors);
  }

  // Handle Duplicate Key Errors (unique constraint)
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
    return errorResponse(res, message, 409, err.keyValue);
  }

  // Handle Invalid ObjectId or CastError
  if (err instanceof mongoose.Error.CastError) {
    message = `Invalid ${err.path}: ${err.value}`;
    return errorResponse(res, message, 400, null);
  }

  // Log non-operational errors for debugging
  if (!err.isOperational) {
    logger.error("A non-operational error occurred", {
      error: err,
      path: req.path,
      method: req.method,
    });
  }

  return errorResponse(res, message, statusCode, err);
};
