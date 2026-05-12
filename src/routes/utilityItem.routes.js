import express from "express";
import {
  createUtilityItem,
  getUtilityItems,
  updateUtilityItem,
  deleteUtilityItem,
  getUtilityDropdown,
  createBulkUtilityItems,
} from "../controllers/utilityItem.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createUtilityItem);
router.post("/bulk", createBulkUtilityItems);
router.get("/", getUtilityItems);
router.get("/dropdown", getUtilityDropdown);
router.patch("/:id", updateUtilityItem);
router.delete("/:id", deleteUtilityItem);

export default router;
