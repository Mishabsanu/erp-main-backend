import * as roleService from "../services/role.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", name, status } = req.query;

  const result = await roleService.getAllRoles({
    page: Number(page),
    limit: Number(limit),
    search,
    name,
    status,
  });

  return successResponse(res, "Roles fetched successfully", 200, result);
});

export const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  const newRole = await roleService.createRole(payload);
  return successResponse(res, "Role created successfully", 201, {
    role: newRole,
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const role = await roleService.getRoleById(id);
  if (!role) throw createError("Role not found", 404);
  return successResponse(res, "Role fetched successfully", 200, {
    content: role,
  });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const updatedRole = await roleService.updateRole(id, payload);
  if (!updatedRole) throw createError("Role not found", 404);
  return successResponse(res, "Role updated successfully", 200, {
    content: updatedRole,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await roleService.deleteRole(id);
  if (!deleted) throw createError("Role not found", 404);
  return successResponse(res, "Role deleted successfully", 200, {});
});



export const dropdown = asyncHandler(async (req, res) => {
  const list = await roleService.getDropdown();
  return successResponse(res, "Dropdown data fetched", 200, list);
});