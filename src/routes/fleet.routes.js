import express from "express";
import * as fleetController from "../controllers/fleet.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Vehicle Routes
router.get("/", authMiddleware, allowRoles("fleet:view"), fleetController.listVehicles);
router.get("/dropdown", authMiddleware, allowRoles("fleet:view"), fleetController.vehicleDropdown);
router.get("/:id", authMiddleware, allowRoles("fleet:view"), fleetController.getVehicle);
router.post("/", authMiddleware, allowRoles("fleet:create"), fleetController.createVehicle);
router.put("/:id", authMiddleware, allowRoles("fleet:update"), fleetController.updateVehicle);
router.delete("/:id", authMiddleware, allowRoles("fleet:delete"), fleetController.deleteVehicle);

// Checkup Routes
router.get("/mechanical/logs", authMiddleware, allowRoles("fleet:view"), fleetController.listCheckups);
router.get("/mechanical/logs/:id", authMiddleware, allowRoles("fleet:view"), fleetController.getCheckup);
router.get("/mechanical/last/:vehicleId", authMiddleware, allowRoles("fleet:view"), fleetController.getLastCheckup);
router.post("/mechanical/checkup", authMiddleware, allowRoles("fleet:create"), upload.array("photos", 5), fleetController.createCheckup);
router.put("/mechanical/logs/:id", authMiddleware, allowRoles("fleet:update"), fleetController.updateCheckup);
router.delete("/mechanical/logs/:id", authMiddleware, allowRoles("fleet:delete"), fleetController.deleteCheckup);

export default router;
