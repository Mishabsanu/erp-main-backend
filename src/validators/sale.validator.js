import { body } from "express-validator";

export const createSaleValidator = [
  body("companyName")
    .notEmpty()
    .withMessage("Company name is required")
    .isString()
    .withMessage("Company name must be a string"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),

  body("contactPersonMobile")
    .notEmpty()
    .withMessage("Contact person mobile is required")
    .isString()
    .withMessage("Mobile number must be a string"),

  body("contactThrough")
    .notEmpty()
    .withMessage("Contact through is required")
    .isIn(["Email", "Phone", "WhatsApp", "Both", "Other"])
    .withMessage("Invalid contactThrough value"),

  body("referenceNo")
    .optional()
    .isString()
    .withMessage("Reference No must be a string"),

  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),

  body("location")
    .notEmpty()
    .withMessage("Location is required")
    .isString()
    .withMessage("Location must be a string"),


  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isString()
    .withMessage("Date must be a string"),

  body("followUpDate")
    .optional()
    .isString()
    .withMessage("Follow up date must be a string"),

  body("remarks").optional().isString().withMessage("Remarks must be a string"),

  body("platform")
    .optional()
    .isIn(["Akod Safe", "Akod Tech", "Akod Scaffolding", "Akod Food", "Avoma", "Other"])
    .withMessage("Invalid platform value"),
];

export const updateSaleValidator = [
  body("companyName")
    .optional()
    .isString()
    .withMessage("Company name must be a string"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please enter a valid email address"),

  body("contactPersonMobile")
    .optional()
    .isString()
    .withMessage("Mobile must be a string"),

  body("contactThrough")
    .optional()
    .isIn(["Email", "Phone", "WhatsApp", "Both", "Other"])
    .withMessage("Invalid contactThrough value"),

  body("referenceNo")
    .optional()
    .isString()
    .withMessage("Reference No must be a string"),

  body("name").optional().isString().withMessage("Name must be a string"),

  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string"),


  body("date").optional().isString().withMessage("Date must be a string"),

  body("followUpDate")
    .optional()
    .isString()
    .withMessage("Follow up date must be a string"),

  body("remarks").optional().isString().withMessage("Remarks must be a string"),

  body("platform")
    .optional()
    .isIn(["Akod Safe", "Akod Tech", "Akod Scaffolding", "Akod Food", "Avoma", "Other"])
    .withMessage("Invalid platform value"),
];
