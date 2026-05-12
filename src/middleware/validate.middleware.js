import { validationResult } from "express-validator";
import { errorResponse } from "../utils/response.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      message: err.msg,
    }));
    return errorResponse(res, "Validation failed", 422, extractedErrors);
  }
  next();
};
