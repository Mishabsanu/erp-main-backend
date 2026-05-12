import { body } from "express-validator";

export const createProductValidator = [
  body("name")
    .notEmpty()
    .withMessage("Product name is required")
    .isString()
    .trim()
    .escape(),
  body("itemCode").notEmpty().isString().withMessage("Item Code is required"),
  body("unit").notEmpty().isString().withMessage("Unit is required"),
];

export const updateProductValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Product name must be a string")
    .trim()
    .escape(),
  body("itemCode")
    .optional()
    .isString()
    .withMessage("Item Code is required")
    .trim()
    .escape(),
  body("unit")
    .optional()
    .isString()
    .withMessage("Unit is required")
    .trim()
    .escape(),
];
