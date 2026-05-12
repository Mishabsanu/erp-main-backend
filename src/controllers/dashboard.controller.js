import { dashboardService } from "../services/dashboard.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const data = await dashboardService.getDashboard(userId);
  return successResponse(res, "Dashboard data fetched successfully", 200, data);
});
