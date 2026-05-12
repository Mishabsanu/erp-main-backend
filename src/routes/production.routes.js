import express from "express";
import * as productionController from "../controllers/production.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles("production:view"), productionController.list);
router.get("/:id", authMiddleware, allowRoles("production:view"), productionController.getOne);
router.post("/", authMiddleware, allowRoles("production:create"), upload.single("image"), productionController.create);
router.put("/:id", authMiddleware, allowRoles("production:update"), upload.single("image"), productionController.update);
router.patch("/:id/approve", authMiddleware, allowRoles("production:update"), productionController.approve);
router.delete("/:id", authMiddleware, allowRoles("production:delete"), productionController.remove);

export default router;
