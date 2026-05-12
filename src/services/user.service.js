import { User } from "../models/User.model.js";
import { createError } from "../utils/AppError.js";
import { Role } from "../models/Role.model.js";
import mongoose from "mongoose";

export const getAllUsers = async ({
  page = 1,
  limit = 10,
  search = "",
  role,
  status,
}) => {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [users, totalCount] = await Promise.all([
    User.find(query)
      .populate("role", "name isSuperAdmin")
      .populate("createdBy", "name")
      .select("-password -refreshTokens -__v")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),

    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    content: users,
    totalCount,
    totalPages,
    currentPage: page,
    limit,
  };
};

export const createUser = async (data) => {
  const { name, email, mobile, password, role, status = "active" } = data;

  if (!role) {
    throw createError("Role is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(role)) {
    throw createError("Invalid Role ID", 400);
  }

  const roleExists = await Role.findById(role);
  if (!roleExists) {
    throw createError("Role not found", 404);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw createError("Email already exists", 400);
  }

  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) {
    throw createError("Mobile number already exists", 400);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    mobile,
    password,
    role,
    status,
    createdBy: data.createdBy,
  });

  const u = user.toObject();
  delete u.password;
  delete u.__v;
  delete u.refreshTokens;
  return u;
};

export const getUserById = async (id) => {
  return await User.findById(id).populate("role").populate("createdBy", "name").select("-__v");
};
export const updateUser = async (id, data) => {
  console.log(data,'data');
  
  const allowed = ["name", "email", "role", "status", "mobile", "password"];
  const updates = Object.keys(data).reduce((acc, key) => {
    if (allowed.includes(key)) acc[key] = data[key];
    return acc;
  }, {});

  if (updates.email) {
    const existing = await User.findOne({
      email: updates.email,
      _id: { $ne: id },
    });
    if (existing) throw createError("Email already in use", 400);
  }

  if (updates.role) {
    if (!mongoose.Types.ObjectId.isValid(updates.role)) {
      throw createError("Invalid Role ID", 400);
    }
    const roleExists = await Role.findById(updates.role);
    if (!roleExists) {
      throw createError("Role not found", 404);
    }
  }

  const user = await User.findById(id);
  if (!user) throw createError("User not found", 404);

  if (updates.name) user.name = updates.name;
  if (updates.email) user.email = updates.email;
  if (updates.mobile) user.mobile = updates.mobile;
  if (updates.role) user.role = updates.role;
  if (updates.status) user.status = updates.status;

  if (updates.password) user.password = updates.password;

  await user.save();

  const u = user.toObject();
  delete u.password;
  delete u.__v;
  delete u.refreshTokens;
  return u;
};

export const deleteUser = async (id) => {
  const deleted = await User.findByIdAndDelete(id);
  return deleted;
};
