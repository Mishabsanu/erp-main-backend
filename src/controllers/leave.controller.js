import { Leave } from "../models/Leave.model.js";
import { Worker } from "../models/Worker.model.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (status) query.status = status;
  
  // Search by worker name is more complex, we'll need to join or pre-filter
  if (search) {
     const workers = await Worker.find({ name: { $regex: search, $options: "i" } }).select("_id");
     const workerIds = workers.map(w => w._id);
     query.workerId = { $in: workerIds };
  }

  const [leaves, totalCount] = await Promise.all([
    Leave.find(query)
      .populate("workerId", "name workerId qidNo designation")
      .populate("relieverId", "name workerId")
      .populate("createdBy", "name")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Leave.countDocuments(query),
  ]);

  return successResponse(res, "Leave records fetched successfully", 200, {
    content: leaves,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id)
    .populate("workerId", "name workerId qidNo designation")
    .populate("relieverId", "name workerId")
    .populate("createdBy", "name")
    .populate("approvedBy", "name");
    
  if (!leave) throw createError("Leave record not found", 404);
  
  return successResponse(res, "Leave record fetched successfully", 200, {
    content: leave,
  });
});

export const create = asyncHandler(async (req, res) => {
  const leaveData = { 
    ...req.body, 
    createdBy: req.user.id 
  };
  
  if (req.file) {
    leaveData.attachment = `/uploads/${req.file.filename}`;
  }

  const leave = await Leave.create(leaveData);
  
  // If status is Approved, update worker status
  if (leave.status === "Approved") {
      await Worker.findByIdAndUpdate(leave.workerId, { status: "on_leave" });
  }

  return successResponse(res, "Leave record created successfully", 201, leave);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const leave = await Leave.findById(id);
  if (!leave) throw createError("Leave record not found", 404);

  const updateData = { ...req.body };
  if (req.file) {
    updateData.attachment = `/uploads/${req.file.filename}`;
  }
  
  // Handle approval
  if (updateData.status === "Approved" && leave.status !== "Approved") {
      updateData.approvedBy = req.user.id;
      await Worker.findByIdAndUpdate(leave.workerId, { status: "on_leave" });
  } else if (updateData.status !== "Approved" && leave.status === "Approved") {
      // Reverting from approved
      await Worker.findByIdAndUpdate(leave.workerId, { status: "active" });
  }

  const updated = await Leave.findByIdAndUpdate(id, updateData, { new: true });
  return successResponse(res, "Leave record updated successfully", 200, updated);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const leave = await Leave.findById(id);
  if (!leave) throw createError("Leave record not found", 404);
  
  if (leave.status === "Approved") {
      await Worker.findByIdAndUpdate(leave.workerId, { status: "active" });
  }

  await Leave.findByIdAndDelete(id);
  return successResponse(res, "Leave record deleted successfully.", 200, {});
});
