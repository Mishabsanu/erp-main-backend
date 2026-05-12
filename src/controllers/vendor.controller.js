import * as vendorService from "../services/vendor.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;

  const result = await vendorService.getAllVendors({
    page: Number(page),
    limit: Number(limit),
    search,
    status,
  });

  return successResponse(res, "Vendors fetched successfully", 200, result);
});

export const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  const newVendor = await vendorService.createVendor(payload);
  return successResponse(res, "Vendor created successfully", 201, {
    vendor: newVendor,
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await vendorService.getVendorById(id);
  if (!vendor) throw createError("Vendor not found", 404);
  return successResponse(res, "Vendor fetched successfully", 200, vendor);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const updatedVendor = await vendorService.updateVendor(id, payload);
  if (!updatedVendor) throw createError("Vendor not found", 404);
  return successResponse(res, "Vendor updated successfully", 200, {
    content: updatedVendor,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await vendorService.deleteVendor(id);
  if (!deleted) throw createError("Vendor not found", 404);
  return successResponse(res, "Vendor deleted successfully", 200, {});
});

export const dropdown = asyncHandler(async (req, res) => {
  const list = await vendorService.getDropdown();
  return successResponse(res, "Dropdown data fetched", 200, list);
});
