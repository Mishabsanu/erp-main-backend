import express from "express";
import * as userController from "../controllers/users.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createUserValidator,
  updateUserValidator,
} from "../validators/user.validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Admin can see and manage all users
router.get("/", authMiddleware, allowRoles("user:view"), userController.getAll);
router.get("/:id", authMiddleware, allowRoles("user:view"), userController.getOne);
router.post(
  "/",
  authMiddleware,
  allowRoles("user:create"),
  createUserValidator,
  validate,
  userController.create
);
router.put(
  "/:id",
  authMiddleware,
  allowRoles("user:update"),
  updateUserValidator,
  validate,
  userController.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("user:delete"),
  userController.remove
);

export default router;
