import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import * as quoteService from "../services/quote.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

// Helper to delete files safely
const deleteFile = (path) => {
  if (path) {
    fs.unlink(path, (err) => {
      if (err) console.error(`Failed to delete temporary file: ${path}`, err);
    });
  }
};

// Helper to delete from Cloudinary
const deleteFromCloudinary = async (url) => {
  if (!url) return;
  try {
    // Extract public ID from URL. Example: "https://.../upload/v123/quotes/abc.jpg" -> "quotes/abc"
    const publicIdMatch = url.match(/(?:quotes\/)([^.]+)/);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = `quotes/${publicIdMatch[1]}`;
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("Failed to delete attachment from Cloudinary", error);
  }
};

export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;
  const quotes = await quoteService.getAll({ page, limit, search, status });
  return successResponse(res, "Quotes fetched successfully", 200, quotes);
});

export const getOne = asyncHandler(async (req, res) => {
  const quote = await quoteService.getById(req.params.id);
  if (!quote) throw createError("Quote not found", 404);
  return successResponse(res, "Quote fetched successfully", 200, {
    content: quote,
  });
});

export const create = asyncHandler(async (req, res) => {
  let attachments = [];

  try {
    if (req.files?.attachments?.length > 0) {
      for (const file of req.files.attachments) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "quotes",
        });
        attachments.push(uploaded.secure_url);
        deleteFile(file.path);
      }
    }

    const body = { ...req.body, attachments, createdBy: req.user.id };
    const quote = await quoteService.create(body);
    return successResponse(res, "Quote created", 201, quote);
  } catch (error) {
    if (req.files?.attachments) req.files.attachments.forEach((f) => deleteFile(f.path));
    throw error;
  }
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quoteToUpdate = await quoteService.getById(id);
  if (!quoteToUpdate) {
    throw createError("Quote not found", 404);
  }

  let attachments = quoteToUpdate.attachments || [];

  try {
    if (req.files?.attachments?.length > 0) {
      // Optionally delete old attachments if new ones are being sent, or merge
      for (const file of req.files.attachments) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "quotes",
        });
        attachments.push(uploaded.secure_url);
        deleteFile(file.path);
      }
    }

    const body = { ...req.body, attachments };
    const quote = await quoteService.update(req.params.id, body);
    if (!quote) throw createError("Quote not found", 404);
    return successResponse(res, "Quote updated", 201, quote);
  } catch (error) {
    if (req.files?.attachments) req.files.attachments.forEach((f) => deleteFile(f.path));
    throw error;
  }
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quote = await quoteService.getById(id);
  if (!quote) {
    throw createError("Quote not found", 404);
  }

  // Delete all attachments from Cloudinary
  if (quote.attachments && quote.attachments.length > 0) {
    for (const url of quote.attachments) {
      await deleteFromCloudinary(url);
    }
  }

  const deleted = await quoteService.remove(req.params.id);
  if (!deleted) throw createError("Quote not found", 404);
  return successResponse(res, "Quote deleted");
});

export const updateQuoteTrackStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const updatedTrack = await quoteService.updateStatus(req.params.id, status);
  if (!updatedTrack) throw createError("Quote track not found", 404);
  return successResponse(res, "Status updated successfully", 200, updatedTrack);
});

export const importFromGoogleSheet = asyncHandler(async (req, res) => {
  const result = await quoteService.importFromGoogleSheet(req.body.url, req.user);
  return successResponse(res, "Import completed", 200, result);
});

export const importFromCsvFile = asyncHandler(async (req, res) => {
  if (!req.file) throw createError("CSV file required", 400);
  const result = await quoteService.importFromCsvFile(req.file, req.user);
  return successResponse(res, "Import completed", 200, result);
});
