import { body } from "express-validator";

export const createVendorValidator = [
  body("company").notEmpty().withMessage("Company name is required"),
  body("mobile")
    .optional({ checkFalsy: true })
    .matches(/^\+?[\d\s-]{7,20}$/)
    .withMessage("Invalid mobile number"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either active or inactive"),
];

export const updateVendorValidator = [
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Invalid email address"),
  body("company").optional().notEmpty().withMessage("Company name is required"),
  body("mobile")
    .optional({ checkFalsy: true })
    .matches(/^\+?[\d\s-]{7,20}$/)
    .withMessage("Invalid mobile number"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either active or inactive"),
];
