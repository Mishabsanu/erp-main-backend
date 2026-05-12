import { body } from "express-validator";

export const createRoleValidator = [
  body("name").notEmpty().withMessage("Name is required"),
];

export const updateRoleValidator = [
  body("name").optional().notEmpty().withMessage("Name is required"),
];
