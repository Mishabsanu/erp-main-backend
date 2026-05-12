import bcrypt from "bcryptjs";
import { User } from "../models/User.model.js";
import { getUserById } from "../services/user.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { successResponse } from "../utils/response.js";
import { Role } from "../models/Role.model.js";
import mongoose from "mongoose";

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

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

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw createError("Email already exists", 400);
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: role,
    status: "active",
  });

  return successResponse(res, "User registered successfully", 201, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const origin = req.get("Origin");
  const { email, password } = req.body;
  if (!email || !password) {
    throw createError("Email and password are required", 400);
  }
  const user = await User.findOne({ email }).populate("role");
  if (!user) {
    throw createError("Email does not exist", 404);
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw createError("Invalid credentials", 401);
  }
  const payload = { id: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true only in prod
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return successResponse(res, "Login successful", 200, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw createError("Refresh token is required", 401);
  const payload = verifyRefreshToken(token);
  const newAccessToken = signAccessToken({
    id: payload.id,
    role: payload.role,
  });
  const newRefreshToken = signRefreshToken({
    id: payload.id,
    role: payload.role,
  });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true only in prod
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };

  res.cookie("refreshToken", newRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.cookie("accessToken", newAccessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  return successResponse(res, "Token refreshed", 200);
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return successResponse(res, "Logged out successfully", 200);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) throw createError("User not found", 404);
  return successResponse(res, "Auth User fetched successfully", 200, user);
});
