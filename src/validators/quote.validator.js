import { body } from "express-validator";

export const createQuoteValidator = [
  // Basic Fields
  body("clientName")
    .notEmpty()
    .withMessage("Client name is required")
    .isString(),

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(["INR", "USD"])
    .withMessage("Currency must be INR or USD"),

  body("exchangeRate")
    .notEmpty()
    .withMessage("Exchange rate is required")
    .isNumeric()
    .withMessage("Exchange rate must be a number"),

  // Shipping Fields
  body("totalContainers")
    .optional()
    .isNumeric()
    .withMessage("totalContainers must be a number"),

  body("costPerContainer")
    .optional()
    .isNumeric()
    .withMessage("costPerContainer must be a number"),

  // Items Must Be Array
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),

  // Validate Each Item
  body("items.*.productId")
    .optional()
    .isString()
    .withMessage("Invalid productId"),

  body("items.*.name")
    .optional()
    .isString()
    .withMessage("Name must be a string"),

  body("items.*.weight")
    .optional()
    .isNumeric()
    .withMessage("Weight must be numeric"),

  body("items.*.qty")
    .optional()
    .isNumeric()
    .withMessage("Quantity must be numeric"),

  body("items.*.price")
    .optional()
    .isNumeric()
    .withMessage("Price must be numeric"),

  body("items.*.priceUSD")
    .optional()
    .isNumeric()
    .withMessage("PriceUSD must be numeric"),

  body("items.*.totalWeight").optional().isNumeric(),

  body("items.*.totalCost").optional().isNumeric(),

  body("items.*.totalCostUSD").optional().isNumeric(),

  body("items.*.shippingAmount").optional().isNumeric(),

  body("items.*.shippingPercentage").optional().isNumeric(),

  body("items.*.totalprice").optional().isNumeric(),

  // Status
  body("status")
    .optional()
    .isIn(["Pending", "Sent", "Approved"])
    .withMessage("Invalid status"),
];

export const updateQuoteValidator = [
  body("clientName").optional().isString(),

  body("currency")
    .optional()
    .isIn(["INR", "USD"])
    .withMessage("Currency must be INR or USD"),

  body("exchangeRate").optional().isNumeric(),

  body("totalContainers").optional().isNumeric(),

  body("costPerContainer").optional().isNumeric(),

  body("items").optional().isArray(),

  body("items.*.productId").optional().isString(),

  body("items.*.name").optional().isString(),

  body("items.*.weight").optional().isNumeric(),

  body("items.*.qty").optional().isNumeric(),

  body("items.*.price").optional().isNumeric(),

  body("items.*.priceUSD").optional().isNumeric(),

  body("items.*.totalWeight").optional().isNumeric(),

  body("items.*.totalCost").optional().isNumeric(),

  body("items.*.totalCostUSD").optional().isNumeric(),

  body("items.*.shippingAmount").optional().isNumeric(),

  body("items.*.shippingPercentage").optional().isNumeric(),

  body("items.*.totalprice").optional().isNumeric(),

  body("status")
    .optional()
    .isIn(["Pending", "Sent", "Approved"])
    .withMessage("Invalid status"),
];
