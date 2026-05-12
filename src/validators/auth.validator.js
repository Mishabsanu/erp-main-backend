import { body, cookie } from "express-validator";

export const registerValidation = [
  body("name").notEmpty().withMessage("Name is required").isLength({ min: 3 }),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(["admin", "user"]).withMessage("Invalid role"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const refreshValidation = [
  cookie("refreshToken").notEmpty().withMessage("Refresh token is required"),
];
