import express from "express";

import {
    getStatus,
    signIn,
    signOut,
    getHistory,
    requestRegularization,
    getRegularizationRequests,
    addRegularizationComment,
    getAdminTodayStatus,
    getAdminAttendanceRange
} from "../controllers/attendance.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/status", authMiddleware, allowRoles("attendance:view"), getStatus);
router.get("/history", authMiddleware, allowRoles("attendance:view"), getHistory);
router.post("/signin", authMiddleware, allowRoles("attendance:create"), signIn);
router.post("/signout", authMiddleware, allowRoles("attendance:update"), signOut);
router.post("/regularization-request", authMiddleware, allowRoles("attendance:create"), requestRegularization);
router.get("/regularization-requests", authMiddleware, allowRoles("attendance:view"), getRegularizationRequests);
router.post("/regularization-request/:id/comment", authMiddleware, allowRoles("attendance:update"), addRegularizationComment);
router.get("/admin/status", authMiddleware, allowRoles("attendance:view"), getAdminTodayStatus);
router.get("/admin/range", authMiddleware, allowRoles("attendance:view"), getAdminAttendanceRange);

export default router;
