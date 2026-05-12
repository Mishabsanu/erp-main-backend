import express from "express";
import * as customerController from "../controllers/customer.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createCustomerValidator,
  updateCustomerValidator,
} from "../validators/customer.validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  allowRoles("customer:view"),
  customerController.getAll
);
router.get(
  "/dropdown",
  authMiddleware,
  allowRoles("customer:view"),
  customerController.getDropdown
);
router.get(
  "/:id",
  authMiddleware,
  allowRoles("customer:view"),
  customerController.getOne
);
router.post(
  "/",
  authMiddleware,
  allowRoles("customer:create"),
  createCustomerValidator,
  validate,
  customerController.create
);
router.put(
  "/:id",
  authMiddleware,
  allowRoles("customer:update"),
  updateCustomerValidator,
  validate,
  customerController.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("customer:delete"),
  customerController.remove
);

export default router;
