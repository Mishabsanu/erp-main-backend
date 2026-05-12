import express from "express";
import * as vendorController from "../controllers/vendor.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createVendorValidator,
  updateVendorValidator,
} from "../validators/vendor.validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles("vendor:view"), vendorController.getAll);
router.get(
  "/dropdown",
  authMiddleware,
  allowRoles("vendor:view"),
  vendorController.dropdown
);
router.get(
  "/:id",
  authMiddleware,
  allowRoles("vendor:view"),
  vendorController.getOne
);
router.post(
  "/",
  authMiddleware,
  allowRoles("vendor:create"),
  createVendorValidator,
  validate,
  vendorController.create
);
router.put(
  "/:id",
  authMiddleware,
  allowRoles("vendor:update"),
  updateVendorValidator,
  validate,
  vendorController.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("vendor:delete"),
  vendorController.remove
);

export default router;
