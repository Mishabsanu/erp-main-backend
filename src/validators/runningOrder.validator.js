import { body } from "express-validator";

const statusEnum = [
  "Order Placed",
  "Partially Completed",
  "Completed",
  "On Hire",
  "Partially Returned",
  "Closed"
];

const currencyEnum = ["INR", "USD", "EUR", "GBP", "JPY", "CNY"];
const transactionTypeEnum = ["Sale", "Hire", "Contract"];

export const createRunningOrderValidator = [
  body("company_name").optional().isString().trim(),
  body("client_name").optional().isString().trim(),
  body("ordered_date")
    .notEmpty()
    .withMessage("Ordered date is required")
    .isISO8601()
    .withMessage("Invalid date format")
    .toDate(),
  body("order_number")
    .optional()
    .isString()
    .trim(),
  body("invoice_number")
    .notEmpty()
    .withMessage("Invoice number is required")
    .isString()
    .trim(),
  body("po_number").optional().isString().trim(),
  body("sales_person").optional().isString().trim(),
  body("project_location").optional().isString().trim(),
  body("invoice_amount").optional().isNumeric().withMessage("Invoice amount must be a number"),
  body("advance_payment").optional().isNumeric().withMessage("Advance payment must be a number"),
  body("currency").optional().isIn(currencyEnum),
  body("etd").optional().isISO8601().toDate(),
  body("eta").optional().isISO8601().toDate(),
  body("remarks").optional().isString().trim(),
  body("status").optional().isIn(statusEnum),
  body("transaction_type")
    .notEmpty()
    .withMessage("Transaction type is required")
    .isIn(transactionTypeEnum),
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),
  body("items.*.productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid Product ID"),
  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isNumeric()
    .withMessage("Quantity must be a number")
    .custom((value) => value > 0)
    .withMessage("Quantity must be greater than 0"),
];

export const updateRunningOrderValidator = [
  body("company_name").optional().isString().trim(),
  body("client_name").optional().isString().trim(),
  body("ordered_date").optional().isISO8601().toDate(),
  body("order_number").optional().isString().trim(),
  body("invoice_number").optional().isString().trim(),
  body("po_number").optional().isString().trim(),
  body("sales_person").optional().isString().trim(),
  body("project_location").optional().isString().trim(),
  body("invoice_amount").optional().isNumeric(),
  body("advance_payment").optional().isNumeric(),
  body("currency").optional().isIn(currencyEnum),
  body("etd").optional().isISO8601().toDate(),
  body("eta").optional().isISO8601().toDate(),
  body("remarks").optional().isString().trim(),
  body("status").optional().isIn(statusEnum),
  body("transaction_type").optional().isIn(transactionTypeEnum),
  body("items").optional().isArray(),
  body("items.*.productId").optional().isMongoId(),
  body("items.*.quantity").optional().isNumeric(),
];
