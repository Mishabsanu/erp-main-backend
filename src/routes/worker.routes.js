import express from "express";
import * as workerController from "../controllers/worker.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles("worker:view"), workerController.listWorkers);
router.get("/dropdown", authMiddleware, workerController.dropdown);
router.get("/:id", authMiddleware, allowRoles("worker:view"), workerController.getWorker);
router.post("/", authMiddleware, allowRoles("worker:create"), upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'qidDoc', maxCount: 1 },
  { name: 'passportDoc', maxCount: 1 },
  { name: 'insuranceDoc', maxCount: 1 },
  { name: 'healthCardDoc', maxCount: 1 },
  { name: 'certificateDoc', maxCount: 1 },
  { name: 'skill_cert_0', maxCount: 1 },
  { name: 'skill_cert_1', maxCount: 1 },
  { name: 'skill_cert_2', maxCount: 1 },
  { name: 'skill_cert_3', maxCount: 1 },
  { name: 'skill_cert_4', maxCount: 1 },
  { name: 'skill_cert_5', maxCount: 1 },
  { name: 'skill_cert_6', maxCount: 1 },
  { name: 'skill_cert_7', maxCount: 1 },
  { name: 'skill_cert_8', maxCount: 1 },
  { name: 'skill_cert_9', maxCount: 1 }
]), workerController.createWorker);
router.put("/:id", authMiddleware, allowRoles("worker:update"), upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'qidDoc', maxCount: 1 },
  { name: 'passportDoc', maxCount: 1 },
  { name: 'insuranceDoc', maxCount: 1 },
  { name: 'healthCardDoc', maxCount: 1 },
  { name: 'certificateDoc', maxCount: 1 },
  { name: 'skill_cert_0', maxCount: 1 },
  { name: 'skill_cert_1', maxCount: 1 },
  { name: 'skill_cert_2', maxCount: 1 },
  { name: 'skill_cert_3', maxCount: 1 },
  { name: 'skill_cert_4', maxCount: 1 },
  { name: 'skill_cert_5', maxCount: 1 },
  { name: 'skill_cert_6', maxCount: 1 },
  { name: 'skill_cert_7', maxCount: 1 },
  { name: 'skill_cert_8', maxCount: 1 },
  { name: 'skill_cert_9', maxCount: 1 }
]), workerController.updateWorker);
router.delete("/:id", authMiddleware, allowRoles("worker:delete"), workerController.deleteWorker);

export default router;
