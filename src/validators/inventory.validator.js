import { body } from "express-validator";

export const createInventory = [
  // body("poNumber")
  //   .notEmpty()
  //   .withMessage("PO Number is required.")
  //   .isString()
  //   .trim(),
  // body("product")
  //   .notEmpty()
  //   .withMessage("Product ID is required.")
  //   .isMongoId()
  //   .withMessage("Product ID is not a valid MongoDB ObjectId."),
  // body("itemCode")
  //   .notEmpty()
  //   .withMessage("Item Code is required.")
  //   .isString()
  //   .trim(),
  // body("orderedQty")
  //   .notEmpty()
  //   .withMessage("Ordered Quantity is required.")
  //   .isNumeric()
  //   .withMessage("Ordered Quantity must be a number.")
  //   .isInt({ min: 0 })
  //   .withMessage("Ordered Quantity cannot be negative."),
  // body("availableQty")
  //   .notEmpty()
  //   .withMessage("Available Quantity is required.")
  //   .isNumeric()
  //   .withMessage("Available Quantity must be a number.")
  //   .isInt({ min: 0 })
  //   .withMessage("Available Quantity cannot be negative."),
];

export const updateInventory = [
  // body("poNumber")
  //   .optional()
  //   .notEmpty()
  //   .withMessage("PO Number cannot be empty.")
  //   .isString()
  //   .trim(),
  // body("product")
  //   .optional()
  //   .notEmpty()
  //   .withMessage("Product ID cannot be empty.")
  //   .isMongoId()
  //   .withMessage("Product ID is not a valid MongoDB ObjectId."),
  // body("itemCode")
  //   .optional()
  //   .notEmpty()
  //   .withMessage("Item Code cannot be empty.")
  //   .isString()
  //   .trim(),
  // body("orderedQty")
  //   .optional()
  //   .isNumeric()
  //   .withMessage("Ordered Quantity must be a number.")
  //   .isInt({ min: 0 })
  //   .withMessage("Ordered Quantity cannot be negative."),
  // body("availableQty")
  //   .optional()
  //   .isNumeric()
  //   .withMessage("Available Quantity must be a number.")
  //   .isInt({ min: 0 })
  //   .withMessage("Available Quantity cannot be negative."),
  // body("status")
  //   .optional()
  //   .isIn(["OPEN", "PARTIALLY_DELIVERED", "COMPLETED"])
  //   .withMessage(
  //     "Status must be one of 'OPEN', 'PARTIALLY_DELIVERED', 'COMPLETED'."
  //   ),
  // body("history").optional().isArray().withMessage("History must be an array."),
  // body("history.*.type")
  //   .optional()
  //   .notEmpty()
  //   .withMessage("History type is required.")
  //   .isIn(["ADD_STOCK", "DELIVERY", "RETURN"])
  //   .withMessage(
  //     "History type must be one of 'ADD_STOCK', 'DELIVERY', 'RETURN'."
  //   ),
  // body("history.*.qty")
  //   .optional()
  //   .notEmpty()
  //   .withMessage("History Quantity is required.")
  //   .isNumeric()
  //   .withMessage("History Quantity must be a number.")
  //   .isInt({ min: 0 })
  //   .withMessage("History Quantity cannot be negative."),
  // body("history.*.ticketNo")
  //   .optional()
  //   .isString()
  //   .withMessage("Ticket Number must be a string.")
  //   .trim()
  //   .escape(),
  // body("history.*.note")
  //   .optional()
  //   .isString()
  //   .withMessage("Note must be a string.")
  //   .trim()
  //   .escape(),
  // body("history.*.date")
  //   .optional()
  //   .isISO8601()
  //   .toDate()
  //   .withMessage("Date must be a valid date."),
];
