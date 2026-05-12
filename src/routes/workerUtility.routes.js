import express from "express";
import {
  issueUtility,
  issueBulkUtilities,
  getWorkerUtilities,
  deleteUtility,
  updateUtilityStatus,
  getGlobalUtilityStats,
} from "../controllers/workerUtility.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", issueUtility);
router.post("/bulk", issueBulkUtilities);
router.get("/worker/:workerId", getWorkerUtilities);
router.get("/stats", getGlobalUtilityStats);
router.patch("/:id/status", updateUtilityStatus);
router.delete("/:id", deleteUtility);

export default router;
