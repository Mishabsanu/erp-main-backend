import express from "express";
import * as rentalController from "../controllers/rental.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware); // All rental routes are protected

router.get("/", rentalController.getRentals);
router.get("/:id", rentalController.getRentalDetails);

export default router;
