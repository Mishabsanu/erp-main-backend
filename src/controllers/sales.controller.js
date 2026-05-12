import { convertGoogleSheetUrlToExport } from "../helper/convertSheet.js";
import { Sale } from "../models/Sale.model.js";
import * as salesService from "../services/sale.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  deleteFilesInBackground,
  uploadFilesInBackground,
} from "../utils/backgroundAttachmentWorker.js";
import logger from "../utils/logger.js";
import {
  errorResponse,
  failResponse,
  successResponse,
} from "../utils/response.js";

export const list = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    search = "",
    startDate = "",
    endDate = "",
    nextFollowUpDate = "",
  } = req.query;
  const sales = await salesService.getAll(req.user, {
    page,
    limit,
    search,
    nextFollowUpDate,
    status,
    startDate,
    endDate,
  });
  return successResponse(res, "Sales fetched successfully", 200, sales);
});

export const getStats = asyncHandler(async (req, res) => {
  const { search, startDate, endDate, nextFollowUpDate } = req.query;
  const stats = await salesService.getStats(req.user, {
    search,
    startDate,
    endDate,
    nextFollowUpDate,
  });
  return successResponse(res, "Sales stats fetched successfully", 200, stats);
});

export const listLastEnquiries = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const sales = await salesService.getAllLastEnquiries(req.user, { search });
  return successResponse(
    res,
    "Last Enquiries fetched successfully",
    200,
    sales
  );
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sale = await salesService.getById(id);
  if (!sale) throw createError("Sale not found or access denied", 404);
  return successResponse(res, "Sale fetched successfully", 200, sale);
});

export const create = asyncHandler(async (req, res) => {
  logger.info(`Sale Create: req.files received: ${JSON.stringify(req.files)}`);
  const body = { ...req.body, attachments: [] };
  const sale = await salesService.create(body, req.user);
  logger.info(`Sale Create: Sale ID created: ${sale._id}`);
  uploadFilesInBackground({
    files: req.files?.attachments,
    model: Sale,
    docId: sale._id,
    field: "attachments",
    folder: "sales",
    isSingle: false,
  });

  return successResponse(
    res,
    "Sale created successfully (attachments uploading in background)",
    201,
    { sale }
  );
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Sale Update: Sale ID being updated: ${id}`);
  logger.info(`Sale Update: req.files received: ${JSON.stringify(req.files)}`);
  const sale = await salesService.getById(id);
  if (!sale) {
    logger.warn(`Sale not found for update with ID: ${id}`);
    throw createError("Sale not found", 404);
  }

  const safeParseArray = (val) => {
    if (!val) return [];
    try {
      if (typeof val === "string" && val.startsWith("["))
        return JSON.parse(val);
      if (typeof val === "string") return [val];
      if (Array.isArray(val)) return val;
      return [];
    } catch (e) {
      logger.error(`Error parsing array for sale update: ${e.message}`);
      return [];
    }
  };

  const removedAttachmentUrls = safeParseArray(req.body.removedAttachmentUrls);

  const { removedAttachmentUrls: _ignore, ...restBody } = req.body;
  const updatedSale = await salesService.update(id, restBody, req.user);
  if (!updatedSale) throw createError("Sale not found or access denied", 404);

  deleteFilesInBackground(removedAttachmentUrls);
  uploadFilesInBackground({
    files: req.files?.attachments,
    model: Sale,
    docId: id,
    field: "attachments",
    folder: "sales",
    isSingle: false,
  });
  return successResponse(
    res,
    "Sale updated (attachments syncing in background)",
    200,
    updatedSale
  );
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sale = await salesService.getById(id);
  if (!sale) {
    logger.warn(`Sale not found for removal with ID: ${id}`);
    throw createError("Sale not found", 404);
  }
  await salesService.remove(id, req.user);
  logger.info(`Sale removed from DB with ID: ${id}`);
  deleteFilesInBackground(sale.attachments || []);
  logger.info(`Background delete initiated for Sale ID: ${id}'s attachments`);
  return successResponse(
    res,
    "Sale deleted successfully (attachments deleting in background)"
  );
});

export const updateSaleStatus = asyncHandler(async (req, res) => {
  const { status, nextFollowUpDate, remarks } = req.body;
  const userId = req.user.id;
  const updatedSale = await salesService.updateStatus(
    req.params.id,
    status,
    nextFollowUpDate,
    remarks,
    userId
  );
  if (!updatedSale) throw createError("Sales not found or access denied", 404);
  return successResponse(res, "Status updated successfully", 200, updatedSale);
});

export const importSalesFromGoogleSheet = asyncHandler(async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return failResponse(res, "Google sheet URL required", 400);
    const exportUrl = convertGoogleSheetUrlToExport(url);
    if (!exportUrl) return failResponse(res, "Invalid sheet URL", 400);
    const result = await salesService.importFromGoogleSheet(
      exportUrl,
      req.user
    );

    return successResponse(res, "Import completed", 200, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
});

export const importSalesFromCsvFile = asyncHandler(async (req, res) => {
  try {
    if (!req.file) return failResponse(res, "CSV file is required", 400);
    const filePath = req.file;
    const result = await salesService.importFromCsvFile(filePath, req.user);
    return successResponse(res, "Import completed", 200, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
});

export const getTicketNo = asyncHandler(async (req, res) => {
  const ticketNo = await salesService.getNextTicketNo();
  return successResponse(res, "Next Ticket Number", 200, { ticketNo });
});
