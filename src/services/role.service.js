import { Role } from "../models/Role.model.js";
import { User } from "../models/User.model.js";
import { createError } from "../utils/AppError.js";

export const getAllRoles = async ({
  page = 1,
  limit = 10,
  search = "",
  status,
}) => {
  const query = {};
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }
  if (status) query.status = status;
  const skip = (page - 1) * limit;
  const [roles, totalCount] = await Promise.all([
    Role.find(query).populate("createdBy", "name").skip(skip).limit(limit).sort({ createdAt: -1 }),
    Role.countDocuments(query),
  ]);
  const totalPages = Math.ceil(totalCount / limit);
  return {
    content: roles,
    totalCount,
    totalPages,
    currentPage: page,
    limit,
  };
};

export const createRole = async (data) => {
  const { name, permissions, status = "active" } = data;
  const existingRole = await Role.findOne({
    name: name.trim().toLowerCase(),
  });
  if (existingRole) {
    throw createError("Role name already exists", 400);
  }
  const role = await Role.create({
    name: name.trim(),
    permissions,
    status,
    isSuperAdmin: data.isSuperAdmin,
    description: data.description,
    createdBy: data.createdBy,
  });
  return role;
};

export const getRoleById = async (id) => {
  const role = await Role.findById(id).populate("createdBy", "name").select("-__v");
  if (!role) throw createError("Role not found", 404);
  return role;
};

export const updateRole = async (id, data) => {
  const allowed = ["name", "permissions", "status", "description", "isSuperAdmin"];
  const updates = Object.keys(data).reduce((acc, key) => {
    if (allowed.includes(key)) acc[key] = data[key];
    return acc;
  }, {});
  
  if (updates.name) {
    const existing = await Role.findOne({
      name: updates.name,
      _id: { $ne: id },
    });
    if (existing) throw createError("Role name already in use", 400);
  }

  const role = await Role.findById(id);
  if (!role) throw createError("Role not found", 404);
  
  role.set(updates);
  await role.save();
  return role;
};

export const deleteRole = async (id) => {
  const userCount = await User.countDocuments({ role: id });
  if (userCount > 0) {
    throw createError(`Cannot delete role. It is assigned to ${userCount} user(s).`, 400);
  }
  const deleted = await Role.findByIdAndDelete(id);
  if (!deleted) throw createError("Role not found", 404);
  return deleted;
};

export const getDropdown = async () => {
  return Role.find(
    {},
    {
      name: 1,
    }
  );
};
