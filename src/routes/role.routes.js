import express from "express";
import * as roleController from "../controllers/role.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createRoleValidator,
  updateRoleValidator,
} from "../validators/role.validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Admin can see and manage all roles
router.get("/", authMiddleware, allowRoles("role:view"), roleController.getAll);
router.get(
  "/dropdown",
  authMiddleware,
  allowRoles("role:view"),
  roleController.dropdown
);
router.get("/:id", authMiddleware, allowRoles("role:view"), roleController.getOne);
router.post(
  "/",
  authMiddleware,
  allowRoles("role:create"),
  createRoleValidator,
  validate,
  roleController.create
);
router.put(
  "/:id",
  authMiddleware,
  allowRoles("role:update"),
  updateRoleValidator,
  validate,
  roleController.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("role:delete"),
  roleController.remove
);

export default router;
