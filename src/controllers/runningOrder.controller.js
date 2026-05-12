import * as runningOrderService from "../services/runningOrder.service.js";
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createError } from "../utils/AppError.js";

export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status, transaction_type, currency } = req.query;
  const result = await runningOrderService.getAllOrders({
    user: req.user,
    page,
    limit,
    search,
    status,
    transaction_type,
    currency,
  });
  return successResponse(res, "Orders fetched successfully", 200, result);
});

export const getOne = asyncHandler(async (req, res) => {
  const order = await runningOrderService.getOrderById(req.params.id);
  if (!order) {
    throw createError("Order not found", 404);
  }
  return successResponse(res, "Order fetched successfully", 200, order);
});

export const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  const order = await runningOrderService.createOrder(payload);
  return successResponse(res, "Order created successfully", 201, order);
});

export const update = asyncHandler(async (req, res) => {
  const order = await runningOrderService.updateOrderById(
    req.params.id,
    req.body
  );
  if (!order) {
    throw createError("Order not found", 404);
  }
  return successResponse(res, "Order updated successfully", 200, order);
});

export const remove = asyncHandler(async (req, res) => {
  const deleted = await runningOrderService.deleteOrderById(req.params.id);
  if (!deleted) {
    throw createError("Order not found", 404);
  }
  return successResponse(res, "Order deleted successfully", 200, {});
});

export const getDropdown = asyncHandler(async (req, res) => {
  const result = await runningOrderService.getOrdersDropdown();
  return successResponse(res, "Dropdown data fetched successfully", 200, result);
});

export const getFulfillment = asyncHandler(async (req, res) => {
  const result = await runningOrderService.getFulfillmentStats(req.params.id, req.query);
  if (!result) {
    throw createError("Order not found", 404);
  }
  return successResponse(res, "Fulfillment data fetched successfully", 200, result);
});

export const GetLatestOrderNo = asyncHandler(async (req, res) => {
  const nextNo = await runningOrderService.getLatestRunningOrderNo();
  return successResponse(res, "Next order number fetched successfully", 200, nextNo);
});
