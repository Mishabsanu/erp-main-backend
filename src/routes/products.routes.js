import express from "express";
import * as productController from "../controllers/products.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createProductValidator,
  updateProductValidator,
} from "../validators/product.validator.js";
import { validate } from "../middleware/validate.middleware.js";
import upload from "../middleware/upload.js";

import { uploadDisk, uploadMemory } from "../config/upload.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  allowRoles("product:view"),
  productController.list
);
router.get(
  "/dropdown",
  authMiddleware,
  allowRoles("product:view"),
  productController.dropdown
);
router.get(
  "/:id",
  authMiddleware,
  allowRoles("product:view"),
  productController.getOne
);

router.get(
  "/:id/history",
  authMiddleware,
  allowRoles("product:view"),
  productController.getHistory
);

router.post(
  "/",
  authMiddleware,
  allowRoles("product:create"),
  createProductValidator,
  validate,
  productController.create
);

router.post(
  "/bulk-import",
  authMiddleware,
  allowRoles("product:create"),
  uploadMemory.single("file"),
  productController.bulkImport
);

router.post(
  "/import/google-sheet",
  authMiddleware,
  allowRoles("product:create"),
  productController.importProductsFromGoogleSheet
);

router.post(
  "/import/csv",
  authMiddleware,
  allowRoles("product:create"),
  uploadMemory.single("file"),
  productController.importProductsFromCsv
);

router.put(
  "/:id",
  authMiddleware,
  allowRoles("product:update"),
  updateProductValidator,
  validate,
  productController.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("product:delete"),
  productController.remove
);

export default router;
