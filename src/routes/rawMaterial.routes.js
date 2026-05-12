import express from "express";
import * as rawMaterialController from "../controllers/rawMaterial.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { uploadMemory } from "../config/upload.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles("production:view"), rawMaterialController.list);
router.get("/dropdown", authMiddleware, allowRoles("production:view"), rawMaterialController.getDropdown);
router.get("/:id", authMiddleware, allowRoles("production:view"), rawMaterialController.getById);

router.post("/", authMiddleware, allowRoles("production:create"), rawMaterialController.create);
router.post("/import/google-sheet", authMiddleware, allowRoles("production:create"), rawMaterialController.importRawMaterialsFromGoogleSheet);
router.post("/import/csv", authMiddleware, allowRoles("production:create"), uploadMemory.single("file"), rawMaterialController.importRawMaterialsFromCsv);

router.put("/:id", authMiddleware, allowRoles("production:update"), rawMaterialController.update);
router.patch("/:id/adjust-stock", authMiddleware, allowRoles("production:update"), rawMaterialController.adjustStock);
router.delete("/:id", authMiddleware, allowRoles("production:delete"), rawMaterialController.remove);

export default router;
