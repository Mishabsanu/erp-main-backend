import * as facilityService from "../services/facility.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import { createError } from "../utils/AppError.js";

// --- FACILITY CONTROLLERS ---
export const listFacilities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", type, status } = req.query;
  const result = await facilityService.getAllFacilities({ page, limit, search, type, status });
  return successResponse(res, "Facilities fetched successfully", 200, result);
});

export const getFacility = asyncHandler(async (req, res) => {
  const facility = await facilityService.getFacilityById(req.params.id);
  return successResponse(res, "Facility fetched successfully", 200, facility);
});

export const createFacility = asyncHandler(async (req, res) => {
  const data = { ...req.body, createdBy: req.user.id };
  const facility = await facilityService.createFacility(data);
  return successResponse(res, "Facility created successfully", 201, facility);
});

export const updateFacility = asyncHandler(async (req, res) => {
  const updated = await facilityService.updateFacility(req.params.id, req.body);
  return successResponse(res, "Facility updated successfully", 200, updated);
});

export const deleteFacility = asyncHandler(async (req, res) => {
  await facilityService.removeFacility(req.params.id);
  return successResponse(res, "Facility deleted successfully", 200, {});
});

export const facilityDropdown = asyncHandler(async (req, res) => {
  const dropdown = await facilityService.getFacilityDropdown();
  return successResponse(res, "Facility dropdown fetched", 200, dropdown);
});

// --- CHECKLIST CONTROLLERS ---
export const listChecklists = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, facilityId, date } = req.query;
  const result = await facilityService.getAllChecklists({ page, limit, facilityId, date });
  return successResponse(res, "Facility checklists fetched successfully", 200, result);
});

export const createChecklist = asyncHandler(async (req, res) => {
  const data = { ...req.body, inspectorId: req.user.id };
  if (req.files && req.files.length > 0) {
    data.photos = req.files.map(f => f.path);
  }
  const checklist = await facilityService.createChecklist(data);
  return successResponse(res, "Facility checklist recorded successfully", 201, checklist);
});

export const getChecklist = asyncHandler(async (req, res) => {
  const checklist = await facilityService.getChecklistById(req.params.id);
  return successResponse(res, "Audit report fetched successfully", 200, checklist);
});

export const updateChecklist = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.files && req.files.length > 0) {
    data.photos = req.files.map(f => f.path);
  }
  const updated = await facilityService.updateChecklist(req.params.id, data);
  return successResponse(res, "Audit report updated successfully", 200, updated);
});

export const deleteChecklist = asyncHandler(async (req, res) => {
  await facilityService.removeChecklist(req.params.id);
  return successResponse(res, "Audit report deleted successfully", 200, {});
});

export const verifyChecklist = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const updated = await facilityService.verifyChecklist(req.params.id, status, req.user.id);
  return successResponse(res, `Audit report ${status.toLowerCase()}`, 200, updated);
});
