import express from "express";
import * as payrollController from "../controllers/payroll.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware); // All payroll routes require authentication

// Salary Breakup Routes
router.get("/breakups", payrollController.listAllBreakups);
router.get("/breakups/me", payrollController.getMyBreakup);
router.get("/breakups/:userId", payrollController.getBreakupByUserId);
router.post("/breakups", payrollController.upsertBreakup);

// Salary Slip Routes
router.get("/slips", payrollController.listSlips);
router.get("/slips/:id", payrollController.getSlipById);
router.post("/slips/generate", payrollController.generateSlip);
router.delete("/slips/:id", payrollController.removeSlip);

export default router;
