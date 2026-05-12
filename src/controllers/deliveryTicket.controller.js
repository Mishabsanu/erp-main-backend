import * as deliveryTicketService from "../services/deliveryTicket.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { createError } from "../utils/AppError.js";

const deleteFile = (path) => {
  if (path && fs.existsSync(path)) {
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

export const AddDeliveryTicket = asyncHandler(async (req, res) => {
  let attachments = {
    signedTicket: "",
    supportingDocs: []
  };

  try {
    // Handle Signed Ticket
    if (req.files?.signedTicket?.[0]) {
      const file = req.files.signedTicket[0];
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "delivery_tickets",
        resource_type: "auto",
      });
      attachments.signedTicket = uploaded.secure_url;
      deleteFile(file.path);
    }

    // Handle Supporting Docs
    if (req.files?.supportingDocs?.length > 0) {
      for (const file of req.files.supportingDocs) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "delivery_tickets",
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
    const savedTicket = await deliveryTicketService.addDeliveryTicket(payload);
    return successResponse(
      res,
      "Delivery ticket created successfully and inventory updated",
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
export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticketToUpdate = await deliveryTicketService.getDeliveryTicketById(id);
  if (!ticketToUpdate) throw createError("Delivery Ticket not found", 404);

  let attachments = ticketToUpdate.attachments || { signedTicket: "", supportingDocs: [] };

  try {
    // Handle new Signed Ticket
    if (req.files?.signedTicket?.[0]) {
      // Delete old one if exists
      if (attachments.signedTicket) await deleteFromCloudinary(attachments.signedTicket);
      
      const file = req.files.signedTicket[0];
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "delivery_tickets",
      });
      attachments.signedTicket = uploaded.secure_url;
      deleteFile(file.path);
    }

    // Handle new Supporting Docs (Append)
    if (req.files?.supportingDocs?.length > 0) {
      for (const file of req.files.supportingDocs) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "delivery_tickets",
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

    const updatedDeliveryTicket = await deliveryTicketService.updateDeliveryTicket(id, payload);
    
    return successResponse(res, "Delivery Ticket updated successfully", 200, {
      content: updatedDeliveryTicket,
    });
  } catch (error) {
    if (req.files?.signedTicket) req.files.signedTicket.forEach(f => deleteFile(f.path));
    if (req.files?.supportingDocs) req.files.supportingDocs.forEach(f => deleteFile(f.path));
    throw error;
  }
});

export const GetDeliveryTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", startDate, endDate, category } = req.query;

  const result = await deliveryTicketService.getDeliveryTickets({
    page: Number(page),
    limit: Number(limit),
    search,
    startDate,
    endDate,
    category,
  });

  return successResponse(
    res,
    "Delivery tickets fetched successfully",
    200,
    result
  );
});

export const GetLatestDeliveryTicketNo = asyncHandler(async (req, res) => {
  const nextTicketNo = await deliveryTicketService.getLatestDeliveryTicketNo();
  return successResponse(
    res,
    "Next delivery ticket number fetched successfully",
    200,
    nextTicketNo
  );
});
export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventory = await deliveryTicketService.getDeliveryTicketById(id);
  if (!inventory) throw createError("Delivery ticket not found", 404);
  return successResponse(
    res,
    "Delivery ticket fetched successfully",
    200,
    inventory
  );
});

export const GetPoNoDropdown = asyncHandler(async (req, res) => {
  const result = await deliveryTicketService.getPoNoDropdown();
  return successResponse(res, "Dropdown Po fetched successfully", 200, result);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await deliveryTicketService.getDeliveryTicketById(id);
  if (!ticket) throw createError("Delivery ticket not found", 404);

  // Clean up attachments
  if (ticket.attachments) {
    if (ticket.attachments.signedTicket) {
      await deleteFromCloudinary(ticket.attachments.signedTicket);
    }
    if (ticket.attachments.supportingDocs?.length > 0) {
      for (const url of ticket.attachments.supportingDocs) {
        await deleteFromCloudinary(url);
      }
    }
  }

  const deleted = await deliveryTicketService.deleteDeliveryTickets(id);
  if (!deleted) throw createError("Delivery tickets not found", 404);
  return successResponse(res, "Delivery tickets deleted successfully", 200, {});
});
