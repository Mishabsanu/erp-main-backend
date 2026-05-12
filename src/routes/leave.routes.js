import express from "express";
import * as leaveController from "../controllers/leave.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles("leave:view"), leaveController.list);
router.get("/:id", authMiddleware, allowRoles("leave:view"), leaveController.getOne);
router.post("/", authMiddleware, allowRoles("leave:create"), upload.single("attachment"), leaveController.create);
router.put("/:id", authMiddleware, allowRoles("leave:update"), upload.single("attachment"), leaveController.update);
router.delete("/:id", authMiddleware, allowRoles("leave:delete"), leaveController.remove);

export default router;
