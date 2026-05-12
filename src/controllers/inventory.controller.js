import * as inventoryService from "../services/inventory.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const getAll = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
    minStock,
    maxStock,
    onlyLowStock,
  } = req.query;

  const result = await inventoryService.getAllInventories({
    page: Number(page),
    limit: Number(limit),
    search,
    status,
    minStock: minStock !== undefined ? Number(minStock) : undefined,
    maxStock: maxStock !== undefined ? Number(maxStock) : undefined,
    onlyLowStock,
  });

  return successResponse(
    res,
    "Inventory list fetched successfully",
    200,
    result
  );
});

export const create = asyncHandler(async (req, res) => {
  let body = req.body;
  
  // If items is a string (due to FormData), parse it
  if (typeof body.items === "string") {
    try {
      body.items = JSON.parse(body.items);
    } catch (e) {
      throw createError("Invalid items format", 400);
    }
  }

  // Handle uploaded files
  if (req.files) {
    if (req.files.deliveryNote) {
      body.deliveryNote = `/uploads/${req.files.deliveryNote[0].filename}`;
    }
    if (req.files.productImage) {
      body.productImage = `/uploads/${req.files.productImage[0].filename}`;
    }
  }

  const payload = { ...body, createdBy: req.user.id };
  const newInventory = await inventoryService.createInventory(payload);
  return successResponse(res, "Inventory created successfully", 201, {
    inventory: newInventory,
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventory = await inventoryService.getInventoryById(id);
  if (!inventory) throw createError("Inventory not found", 404);
  return successResponse(res, "Inventory fetched successfully", 200, inventory);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = { ...req.body };

  // Handle uploaded files during update
  if (req.files) {
    if (req.files.deliveryNote) {
      body.deliveryNote = `/uploads/${req.files.deliveryNote[0].filename}`;
    }
    if (req.files.productImage) {
      body.productImage = `/uploads/${req.files.productImage[0].filename}`;
    }
  }

  const updatedInventory = await inventoryService.updateInventory(id, body);
  if (!updatedInventory) throw createError("Inventory not found", 404);
  return successResponse(res, "Inventory updated successfully", 200, {
    content: updatedInventory,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await inventoryService.deleteInventory(id);
  if (!deleted) throw createError("Inventory not found", 404);
  return successResponse(res, "Inventory deleted successfully", 200, {});
});

export const dropdown = asyncHandler(async (req, res) => {
  const list = await inventoryService.getInventoryDropdown();
  return successResponse(res, "Inventory dropdown data fetched", 200, list);
});

export const GetAvailableProducts = asyncHandler(async (req, res) => {
  const productsInInventory = await inventoryService.getAvailableProducts();
  return successResponse(
    res,
    "Available products fetched successfully",
    200,
    productsInInventory
  );
});
