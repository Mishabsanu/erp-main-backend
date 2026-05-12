import * as productService from "../services/product.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import fs from "fs";
import { convertGoogleSheetUrlToExport } from "../helper/convertSheet.js";
import { successResponse, errorResponse, failResponse } from "../utils/response.js";

export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;
  const result = await productService.getAll({
    page,
    limit,
    search,
    status,
  });
  return successResponse(res, "Products fetched successfully", 200, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id);
  if (!product) {
    throw createError("Product not found", 404);
  }
  return successResponse(res, "Product fetched successfully", 200, {
    content: product,
  });
});

export const create = asyncHandler(async (req, res) => {
  const productData = { ...req.body, createdBy: req.user.id };
  const product = await productService.create(productData);
  return successResponse(res, "Product created successfully", 201, product);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getById(id);
  if (!product) throw createError("Product not found", 404);
  const updated = await productService.update(id, req.body);
  return successResponse(res, "Product updated successfully", 200, updated);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getById(id);
  if (!product) throw createError("Product not found", 404);
  await productService.remove(id);
  return successResponse(res, "Product deleted successfully.", 200, {});
});

export const dropdown = asyncHandler(async (req, res) => {
  const list = await productService.getDropdown();
  return successResponse(res, "Dropdown data fetched", 200, list);
});

export const getHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const history = await productService.getHistory(id);
  return successResponse(res, "Product history fetched successfully", 200, history);
});

export const importProductsFromGoogleSheet = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return failResponse(res, "Google sheet URL required", 400);
  const exportUrl = convertGoogleSheetUrlToExport(url);
  if (!exportUrl) return failResponse(res, "Invalid sheet URL", 400);
  
  const result = await productService.importFromGoogleSheet(exportUrl, req.user.id);
  return successResponse(res, "Products imported successfully from Google Sheet", 200, result);
});

export const importProductsFromCsv = asyncHandler(async (req, res) => {
  if (!req.file) throw createError("Please upload a CSV file", 400);
  
  const result = await productService.importFromCsvFile(req.file, req.user.id);
  
  // Cleanup file if it was saved to disk
  if (req.file.path) {
    fs.unlinkSync(req.file.path);
  }
  
  return successResponse(res, "Products imported successfully from CSV", 200, result);
});

// Legacy handler - refactored to use service
export const bulkImport = asyncHandler(async (req, res) => {
  return importProductsFromCsv(req, res);
});
