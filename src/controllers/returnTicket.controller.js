import * as returnTicketService from "../services/returnTicket.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../utils/response.js";
import cloudinary from "../config/cloudinary.js";
import { createError } from "../utils/AppError.js";
import fs from "fs";
const deleteFile = (path) => {
  if (path) {
    fs.unlink(path, (err) => {
      if (err) console.error(`Failed to delete temporary file: ${path}`, err);
    });
  }
};
const deleteFromCloudinary = async (url) => {
  if (!url) return;
  try {
    const publicIdMatch = url.match(/(?:\/)([^/]+)(?=\.[^.]+($|\?))/);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = publicIdMatch[1];
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("Failed to delete attachment from Cloudinary", error);
  }
};
export const AddReturnTicket = asyncHandler(async (req, res) => {
  try {
    const attachments = { signedTicket: "", supportingDocs: [] };

    // Handle Signed Ticket
    if (req.files?.signedTicket?.[0]) {
      const file = req.files.signedTicket[0];
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "return_tickets",
        resource_type: "auto",
      });
      attachments.signedTicket = uploaded.secure_url;
      deleteFile(file.path);
    }

    // Handle Supporting Docs
    if (req.files?.supportingDocs?.length > 0) {
      for (const file of req.files.supportingDocs) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "return_tickets",
          resource_type: "auto",
        });
        attachments.supportingDocs.push(uploaded.secure_url);
        deleteFile(file.path);
      }
    }

    const body = { ...req.body };

    // Parse nested objects if they are sent as strings (typical in Multipart/FormData)
    if (typeof body.items === 'string') body.items = JSON.parse(body.items);
    if (typeof body.deliveredBy === 'string') body.deliveredBy = JSON.parse(body.deliveredBy);
    if (typeof body.receivedBy === 'string') body.receivedBy = JSON.parse(body.receivedBy);

    const payload = { ...body, attachments, createdBy: req.user.id };
    const savedTicket = await returnTicketService.addReturnTicket(payload);

    return successResponse(
      res,
      "Return ticket created successfully and inventory updated",
      201,
      savedTicket
    );
  } catch (error) {
    // Clean up local files on error
    if (req.files?.signedTicket) req.files.signedTicket.forEach(f => deleteFile(f.path));
    if (req.files?.supportingDocs) req.files.supportingDocs.forEach(f => deleteFile(f.path));
    throw error;
  }
});

export const GetReturnTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", startDate, endDate, category } = req.query;

  const result = await returnTicketService.getReturnTickets({
    page: Number(page),
    limit: Number(limit),
    search,
    startDate,
    endDate,
    category,
  });

  return successResponse(
    res,
    "Return tickets fetched successfully",
    200,
    result
  );
});

export const GetLatestReturnTicketNo = asyncHandler(async (req, res) => {
  const nextTicketNo = await returnTicketService.getLatestReturnTicketNo();
  return successResponse(
    res,
    "Next return ticket number fetched successfully",
    200,
    nextTicketNo
  );
});

export const GetDeliveredProducts = asyncHandler(async (req, res) => {
  const deliveredProducts = await returnTicketService.getDeliveredProducts();
  return successResponse(
    res,
    "Delivered products fetched successfully",
    200,
    deliveredProducts
  );
});

export const GetDeliveryByPo = asyncHandler(async (req, res) => {
  const { poNo } = req.query;

  if (!poNo) {
    throw createError("PO number is required", 400);
  }

  const data = await returnTicketService.getDeliveryByPo(poNo);

  return successResponse(
    res,
    "Delivery tickets fetched successfully",
    200,
    data
  );
});

export const GetPoReport = asyncHandler(async (req, res) => {
  const report = await returnTicketService.getPoReport(req.query.po_no);
  return successResponse(res, "PO report fetched successfully", 200, report);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await returnTicketService.deleteReturnTickets(id);
  if (!deleted) throw createError("Return tickets not found", 404);
  return successResponse(res, "Return tickets deleted successfully", 200, {});
});

export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventory = await returnTicketService.getReturnTicketById(id);
  if (!inventory) throw createError("Return ticket not found", 404);
  return successResponse(
    res,
    "Return ticket fetched successfully",
    200,
    inventory
  );
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const ticketToUpdate = await returnTicketService.getReturnTicketById(id);
    if (!ticketToUpdate) {
      throw createError("Return Ticket not found", 404);
    }

    let attachments = ticketToUpdate.attachments || { signedTicket: "", supportingDocs: [] };

    // Handle new Signed Ticket
    if (req.files?.signedTicket?.[0]) {
      const file = req.files.signedTicket[0];
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "return_tickets",
        resource_type: "auto",
      });
      attachments.signedTicket = uploaded.secure_url;
      deleteFile(file.path);
    }

    // Handle new Supporting Docs (Append)
    if (req.files?.supportingDocs?.length > 0) {
      for (const file of req.files.supportingDocs) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "return_tickets",
          resource_type: "auto",
        });
        attachments.supportingDocs.push(uploaded.secure_url);
        deleteFile(file.path);
      }
    }
    
    // Handle Attachment Removal
    if (req.body.removeUrl) {
      const { removeUrl, removeType } = req.body;
      if (removeType === 'signedTicket') {
        if (attachments.signedTicket === removeUrl) {
          await deleteFromCloudinary(removeUrl);
          attachments.signedTicket = "";
        }
      } else if (removeType === 'supportingDocs') {
        const index = attachments.supportingDocs.indexOf(removeUrl);
        if (index > -1) {
          await deleteFromCloudinary(removeUrl);
          attachments.supportingDocs.splice(index, 1);
        }
      }
    }

    const body = { ...req.body };

    // Parse nested objects if they are sent as strings (typical in Multipart/FormData)
    if (typeof body.items === 'string') body.items = JSON.parse(body.items);
    if (typeof body.deliveredBy === 'string') body.deliveredBy = JSON.parse(body.deliveredBy);
    if (typeof body.receivedBy === 'string') body.receivedBy = JSON.parse(body.receivedBy);
    
    // Ensure removeUrl is cleaned from payload so it doesn't get saved to other fields
    delete body.removeUrl;
    delete body.removeType;

    const payload = { ...body, attachments };
    const updatedReturnTicket = await returnTicketService.updateReturnTicket(id, payload);
    
    return successResponse(res, "Return Ticket updated successfully", 200, {
      content: updatedReturnTicket,
    });
  } catch (error) {
    if (req.files?.signedTicket) req.files.signedTicket.forEach(f => deleteFile(f.path));
    if (req.files?.supportingDocs) req.files.supportingDocs.forEach(f => deleteFile(f.path));
    throw error;
  }
});
