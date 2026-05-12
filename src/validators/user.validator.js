import { body } from "express-validator";
import mongoose from "mongoose";

export const createUserValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6+ characters"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid role ID"),
];

export const updateUserValidator = [
  body("name").optional().notEmpty().withMessage("Name is required"),
  body("email").optional().isEmail().withMessage("Invalid email address"),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be 6+ characters"),
  body("role")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid role ID"),
];
