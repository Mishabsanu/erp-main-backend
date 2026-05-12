import express from "express";
import * as authCtrl from "../controllers/auth.controller.js";
import {
  registerValidation,
  loginValidation,
  refreshValidation,
} from "../validators/auth.validator.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

router.post("/register", registerValidation, validate, authCtrl.register);
router.post("/login", loginValidation, validate, authCtrl.login);
router.post("/refresh", refreshValidation, validate, authCtrl.refresh);
router.post("/logout", refreshValidation, validate, authCtrl.logout);
// Private route
router.get("/me", authMiddleware, authCtrl.getMe);

export default router;
