import * as userService from "../services/user.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", role, status } = req.query;

  const result = await userService.getAllUsers({
    page: Number(page),
    limit: Number(limit),
    search,
    role,
    status,
  });

  return successResponse(res, "Users fetched successfully", 200, result);
});

export const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  const newUser = await userService.createUser(payload);
  return successResponse(res, "User created successfully", 201, {
    user: newUser,
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);
  if (!user) throw createError("User not found", 404);
  return successResponse(res, "User fetched successfully", 200, {
    content: user,
  });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const updatedUser = await userService.updateUser(id, payload);
  if (!updatedUser) throw createError("User not found", 404);
  return successResponse(res, "User updated successfully", 200, {
    content: updatedUser,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await userService.deleteUser(id);
  if (!deleted) throw createError("User not found", 404);
  return successResponse(res, "User deleted successfully", 200, {});
});
