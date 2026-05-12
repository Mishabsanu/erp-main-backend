import * as payrollService from "../services/payroll.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import { createError } from "../utils/AppError.js";

/**
 * SALARY BREAKUP CONTROLLERS
 */

export const getMyBreakup = asyncHandler(async (req, res) => {
  const breakup = await payrollService.getSalaryBreakupByUser(req.user._id);
  if (!breakup) throw createError("Salary breakup not found", 404);
  return successResponse(res, "Salary breakup fetched successfully", 200, { content: breakup });
});

export const getBreakupByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const breakup = await payrollService.getSalaryBreakupByUser(userId);
  return successResponse(res, "Salary breakup fetched successfully", 200, { content: breakup });
});

export const upsertBreakup = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  const breakup = await payrollService.upsertSalaryBreakup(payload);
  return successResponse(res, "Salary breakup saved successfully", 200, { content: breakup });
});

export const listAllBreakups = asyncHandler(async (req, res) => {
  const breakups = await payrollService.getAllSalaryBreakups();
  return successResponse(res, "All salary breakups fetched successfully", 200, { content: breakups });
});

/**
 * SALARY SLIP CONTROLLERS
 */

export const generateSlip = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    generatedBy: req.user._id,
    createdBy: req.user.id,
  };
  const slip = await payrollService.generateSalarySlip(payload);
  return successResponse(res, "Salary slip generated successfully", 201, { content: slip });
});

export const listSlips = asyncHandler(async (req, res) => {
  const slips = await payrollService.getAllSalarySlips(req.query);
  return successResponse(res, "Salary slips fetched successfully", 200, { content: slips });
});

export const getSlipById = asyncHandler(async (req, res) => {
  const slip = await payrollService.getSalarySlipById(req.params.id);
  if (!slip) throw createError("Salary slip not found", 404);
  return successResponse(res, "Salary slip fetched successfully", 200, { content: slip });
});

export const removeSlip = asyncHandler(async (req, res) => {
  await payrollService.deleteSalarySlip(req.params.id);
  return successResponse(res, "Salary slip deleted successfully", 200, {});
});
