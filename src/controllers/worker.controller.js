import * as workerService from "../services/worker.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import { createError } from "../utils/AppError.js";
import { processWorkerUploadsInBackground } from "../utils/workerBackgroundUploader.js";

export const listWorkers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status, facilityId } = req.query;
  const result = await workerService.getAllWorkers({ page, limit, search, status, facilityId });
  return successResponse(res, "Workers fetched successfully", 200, result);
});

export const getWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.getWorkerById(req.params.id);
  return successResponse(res, "Worker fetched successfully", 200, worker);
});

export const createWorker = asyncHandler(async (req, res) => {
  const data = { ...req.body, createdBy: req.user.id };

  // Parse JSON strings from multipart/form-data
  if (typeof data.skills === 'string') {
    try {
      data.skills = JSON.parse(data.skills);
    } catch (e) {
      data.skills = [];
    }
  }
  if (typeof data.utilities === 'string') {
    try {
      data.utilities = JSON.parse(data.utilities);
    } catch (e) {
      data.utilities = [];
    }
  }
  
  
  const worker = await workerService.createWorker(data);

  // Trigger background upload if files exist
  if (req.files && Object.keys(req.files).length > 0) {
    processWorkerUploadsInBackground(worker._id, req.files);
  }

  return successResponse(res, "Worker created. Profile is being processed.", 201, worker);
});

export const updateWorker = asyncHandler(async (req, res) => {
  const data = { ...req.body };

  // Parse JSON strings from multipart/form-data
  if (typeof data.skills === 'string') {
    try {
      data.skills = JSON.parse(data.skills);
    } catch (e) {
      // keep it as is or handle accordingly
    }
  }
  if (typeof data.utilities === 'string') {
    try {
      data.utilities = JSON.parse(data.utilities);
    } catch (e) {
      // keep it as is or handle accordingly
    }
  }

  const updated = await workerService.updateWorker(req.params.id, data);

  // Trigger background upload if new files exist
  if (req.files && Object.keys(req.files).length > 0) {
    processWorkerUploadsInBackground(req.params.id, req.files);
  }

  return successResponse(res, "Worker updated. Documents are being processed.", 200, updated);
});

export const deleteWorker = asyncHandler(async (req, res) => {
  await workerService.removeWorker(req.params.id);
  return successResponse(res, "Worker deleted successfully", 200, {});
});

export const dropdown = asyncHandler(async (req, res) => {
  const list = await workerService.getWorkersDropdown();
  return successResponse(res, "Workers dropdown fetched", 200, list);
});
