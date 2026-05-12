import * as customerService from "../services/customer.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;

  const result = await customerService.getAllCustomers({
    page: Number(page),
    limit: Number(limit),
    search,
    status,
  });

  return successResponse(res, "Customers fetched successfully", 200, result);
});

export const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  const newCustomer = await customerService.createCustomer(payload);
  return successResponse(res, "Customer created successfully", 201, {
    customer: newCustomer,
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await customerService.getCustomerById(id);
  if (!customer) throw createError("Customer not found", 404);  
  return successResponse(res, "Customer fetched successfully", 200, customer);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const updatedCustomer = await customerService.updateCustomer(id, payload);
  if (!updatedCustomer) throw createError("Customer not found", 404);
  return successResponse(res, "Customer updated successfully", 200, {
    content: updatedCustomer,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await customerService.deleteCustomer(id);
  if (!deleted) throw createError("Customer not found", 404);
  return successResponse(res, "Customer deleted successfully", 200, {});
});

export const getDropdown = asyncHandler(async (req, res) => {
  const result = await customerService.getDropdown();
  return successResponse(res, "Customers fetched successfully", 200, result);
});
