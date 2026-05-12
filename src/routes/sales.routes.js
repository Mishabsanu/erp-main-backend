import express from "express";
import * as salesCtrl from "../controllers/sales.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createSaleValidator,
  updateSaleValidator,
} from "../validators/sale.validator.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadDisk, uploadMemory } from "../config/upload.js";

const router = express.Router();

router.get("/stats", authMiddleware, allowRoles("sales:view"), salesCtrl.getStats);
router.get("/", authMiddleware, allowRoles("sales:view"), salesCtrl.list);
router.get(
  "/last-enquiries",
  authMiddleware,
  allowRoles("sales:view"),
  salesCtrl.listLastEnquiries
);
router.get(
  "/:id",
  authMiddleware,
  allowRoles("sales:view"),
  salesCtrl.getOne
);
router.post(
  "/",
  authMiddleware,
  allowRoles("sales:create"),
  uploadDisk.fields([{ name: "attachments", maxCount: 20 }]),
  createSaleValidator,
  validate,
  salesCtrl.create
);
router.put(
  "/:id",
  authMiddleware,
  allowRoles("sales:update"),
  uploadDisk.fields([{ name: "attachments", maxCount: 20 }]),
  updateSaleValidator,
  validate,
  salesCtrl.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("sales:delete"),
  salesCtrl.remove
);
router.patch(
  "/:id/update-status",
  authMiddleware,
  allowRoles("sales:update"),
  salesCtrl.updateSaleStatus
);
router.post(
  "/import/google-sheet",
  authMiddleware,
  allowRoles("sales:create"),
  salesCtrl.importSalesFromGoogleSheet
);

router.post(
  "/import/csv",
  authMiddleware,
  allowRoles("sales:create"),
  uploadMemory.single("file"),
  salesCtrl.importSalesFromCsvFile
);

router.get(
  "/ticket/no",
  authMiddleware,
  allowRoles("sales:view"),
  salesCtrl.getTicketNo
);

export default router;
