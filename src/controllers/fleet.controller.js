import * as fleetService from "../services/fleet.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import { createError } from "../utils/AppError.js";

// --- VEHICLE CONTROLLERS ---
export const listVehicles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;
  const result = await fleetService.getAllVehicles({ page, limit, search, status });
  return successResponse(res, "Vehicles fetched successfully", 200, result);
});

export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await fleetService.getVehicleById(req.params.id);
  return successResponse(res, "Vehicle fetched successfully", 200, vehicle);
});

export const createVehicle = asyncHandler(async (req, res) => {
  const data = { ...req.body, createdBy: req.user.id };
  const vehicle = await fleetService.createVehicle(data);
  return successResponse(res, "Vehicle created successfully", 201, vehicle);
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const updated = await fleetService.updateVehicle(req.params.id, req.body);
  return successResponse(res, "Vehicle updated successfully", 200, updated);
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  await fleetService.removeVehicle(req.params.id);
  return successResponse(res, "Vehicle deleted successfully", 200, {});
});

export const vehicleDropdown = asyncHandler(async (req, res) => {
  const dropdown = await fleetService.getVehicleDropdown();
  return successResponse(res, "Vehicle dropdown fetched", 200, dropdown);
});

// --- CHECKUP CONTROLLERS ---
export const listCheckups = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, vehicleId, date, startDate, endDate } = req.query;
  const result = await fleetService.getAllCheckups({ page, limit, vehicleId, date, startDate, endDate });
  return successResponse(res, "Mechanical checkups fetched successfully", 200, result);
});

export const createCheckup = asyncHandler(async (req, res) => {
  const data = { ...req.body, inspectorId: req.user.id };
  if (req.files && req.files.length > 0) {
    data.photos = req.files.map(f => f.path);
  }
  const checkup = await fleetService.createCheckup(data);
  return successResponse(res, "Mechanical checkup recorded successfully", 201, checkup);
});

export const getCheckup = asyncHandler(async (req, res) => {
  const checkup = await fleetService.getCheckupById(req.params.id);
  if (!checkup) throw createError("Checkup not found", 404);
  return successResponse(res, "Checkup details fetched", 200, checkup);
});

export const getLastCheckup = asyncHandler(async (req, res) => {
  const checkup = await fleetService.getLastCheckup(req.params.vehicleId);
  return successResponse(res, "Last checkup retrieved", 200, checkup);
});

export const updateCheckup = asyncHandler(async (req, res) => {
  const updated = await fleetService.updateCheckup(req.params.id, req.body);
  return successResponse(res, "Checkup updated successfully", 200, updated);
});

export const deleteCheckup = asyncHandler(async (req, res) => {
  await fleetService.removeCheckup(req.params.id);
  return successResponse(res, "Checkup deleted successfully", 200, {});
});
