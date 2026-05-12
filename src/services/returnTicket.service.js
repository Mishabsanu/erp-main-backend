import {DeliveryTicket} from "../models/DeliveryTicket.model.js";
import { Inventory } from "../models/Inventory.model.js";
import ReturnTicketModel from "../models/ReturnTicket.model.js";
import { createError } from "../utils/AppError.js";
import { recalculateRunningOrderStatus } from "./deliveryTicket.service.js";

export const addReturnTicket = async (ticketData) => {
  const { items, ticketNo, customerId } = ticketData;
  for (let ticketItem of items) {
    const inventoryItem = await Inventory.findOne({
      itemCode: ticketItem.itemCode,
    });

    if (!inventoryItem) {
      throw createError(
        `Item with code ${ticketItem.itemCode} not found in inventory`,
        400
      );
    }
  }

  const newTicket = new ReturnTicketModel(ticketData);
  const savedTicket = await newTicket.save();

  for (let ticketItem of items) {
    const inv = await Inventory.findOne({ itemCode: ticketItem.itemCode });
    if (!inv) continue;

    inv.availableQty += ticketItem.returnQty;
    inv.history.push({
      type: "RETURN",
      stock: ticketItem.returnQty,
      customerId: customerId,
      note: `Returned via ${ticketNo}`,
      date: new Date(),
      ticketNo: ticketNo,
    });

    await inv.save();
  }

  /* ---------------- UPDATE RUNNING ORDER STATUS ---------------- */
  if (ticketData.runningOrderId) {
    await recalculateRunningOrderStatus(ticketData.runningOrderId);
  }

  return savedTicket;
};

export const getReturnTickets = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    startDate,
    endDate,
    client_name,
    category,
  } = queryParams;

  const query = {};

  if (search) {
    query.$or = [
      { ticketNo: { $regex: search, $options: "i" } },
      { poNo: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { invoiceNo: { $regex: search, $options: "i" } },
      { noteCategory: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
      { projectLocation: { $regex: search, $options: "i" } },
      { "deliveredBy.deliveredByName": { $regex: search, $options: "i" } },
      { "receivedBy.receivedByName": { $regex: search, $options: "i" } },
      { vehicleNo: { $regex: search, $options: "i" } },
      { "items.name": { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.noteCategory = category;
  }

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (client_name) {
    query.customerName = { $regex: client_name, $options: "i" };
  }

  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;

  const [tickets, totalCount] = await Promise.all([
    ReturnTicketModel.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    ReturnTicketModel.countDocuments(query),
  ]);

  return {
    content: tickets,
    totalCount,
    pageNumber,
    pageSize,
  };
};

export const getLatestReturnTicketNo = async () => {
  const latest = await ReturnTicketModel.findOne()
    .sort({ ticketNo: -1 })
    .lean();
  let nextNo = "RT-00001";
  if (latest?.ticketNo) {
    const lastNumber = parseInt(latest.ticketNo.replace("RT-", ""), 10);

    if (!isNaN(lastNumber)) {
      nextNo = `RT-${String(lastNumber + 1).padStart(5, "0")}`;
    }
  }
  return nextNo;
};

export const getDeliveredProducts = async () => {
  const deliveredProducts = await DeliveryTicket.aggregate([
    { $unwind: "$items" },
    {
      $project: {
        _id: 0,
        itemCode: "$items.itemCode",
        item: "$items.item",
        unit: "$items.unit",
        description: "$items.description",
        quantity: "$items.quantity",
      },
    },
  ]);
  return deliveredProducts;
};

export const getDeliveryByPo = async (poNo) => {
  /* 1️⃣ Fetch delivery tickets */
  const deliveryTickets = await DeliveryTicket.find({ poNo }).sort({
    createdAt: -1,
  });

  /* 2️⃣ Fetch return tickets */
  const returnTickets = await ReturnTicketModel.find({ poNo });

  /* 3️⃣ Map returned quantity by itemCode (FIXED) */
  const returnQtyMap = {};

  returnTickets.forEach((ticket) => {
    if (Array.isArray(ticket.items)) {
      ticket.items.forEach((item) => {
        const code = item.itemCode;

        // ✅ USE returnQty (fallback to quantity if needed)
        const returnedQty = Number(item.returnQty ?? item.quantity) || 0;

        returnQtyMap[code] = (returnQtyMap[code] || 0) + returnedQty;
      });
    }
  });

  /* 4️⃣ Build updated delivery tickets */
  const updatedTickets = deliveryTickets.map((ticket) => {
    const items = (ticket.items || []).map((item) => {
      const deliveredQty = Number(item.quantity) || 0;
      const returnedQty = Math.min(
        returnQtyMap[item.itemCode] || 0,
        deliveredQty
      );

      const availableQty = deliveredQty - returnedQty;

      return {
        ...(item.toObject?.() || item),
        deliveredQty,
        returnedQty,
        availableQty,
      };
    });

    return {
      ...ticket.toObject(),
      items,
    };
  });

  /* 5️⃣ Total returned quantity (SAFE & CORRECT) */
  const totalReturnedQty = updatedTickets.reduce((total, ticket) => {
    return (
      total +
      ticket.items.reduce((sum, item) => sum + (item.returnedQty || 0), 0)
    );
  }, 0);

  /* 6️⃣ Final response */
  return {
    deliveryTickets: updatedTickets,
    totalReturnedQty,
  };
};

export const getPoReport = async (poNo) => {
  if (!poNo) {
    throw createError("PO number is required", 400);
  }

  const deliveryTickets = await DeliveryTicket.find({ poNo }).sort({
    createdAt: -1,
  });
  const returnTickets = await ReturnTicketModel.find({ poNo }).sort({
    createdAt: -1,
  });

  if (!deliveryTickets.length && !returnTickets.length) {
    throw createError("No tickets found for this PO number", 404);
  }

  const itemSummary = {};

  const deliveryDetails = deliveryTickets.map((ticket) => {
    ticket.items.forEach((item) => {
      if (!itemSummary[item.itemCode]) {
        itemSummary[item.itemCode] = {
          item: item.item,
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit || "",
          ordered_qty: 0,
          delivered_qty: 0,
          returned_qty: 0,
        };
      }
      itemSummary[item.itemCode].ordered_qty += item.quantity || 0;
      itemSummary[item.itemCode].delivered_qty += item.quantity || 0;
    });

    return {
      ticket_no: ticket.ticket_no,
      date: ticket.date,
      client_name: ticket.client_name,
      vehicle_no: ticket.vehicle_no,
      items: ticket.items,
    };
  });

  const returnDetails = returnTickets.map((ticket) => {
    ticket.items.forEach((item) => {
      if (!itemSummary[item.itemCode]) {
        itemSummary[item.itemCode] = {
          item: item.item,
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit || "",
          ordered_qty: 0,
          delivered_qty: 0,
          returned_qty: 0,
        };
      }
      itemSummary[item.itemCode].returned_qty += item.quantity || 0;
    });

    return {
      ticket_no: ticket.ticket_no,
      date: ticket.date,
      client_name: ticket.client_name,
      vehicle_no: ticket.vehicle_no,
      items: ticket.items.map((i) => ({
        item: i.item,
        itemCode: i.itemCode,
        quantity: i.quantity,
      })),
    };
  });

  const summaryItems = Object.values(itemSummary).map((item) => ({
    ...item,
    pending_qty: Math.max(0, item.delivered_qty - item.returned_qty),
  }));

  const summary = {
    total_ordered_qty: summaryItems.reduce((a, b) => a + b.ordered_qty, 0),
    total_delivered_qty: summaryItems.reduce((a, b) => a + b.delivered_qty, 0),
    total_returned_qty: summaryItems.reduce((a, b) => a + b.returned_qty, 0),
    total_pending_qty: summaryItems.reduce((a, b) => a + b.pending_qty, 0),
  };

  return {
    poNo,
    summary,
    items: summaryItems,
    details: {
      deliveries: deliveryDetails,
      returns: returnDetails,
    },
  };
};

export const deleteReturnTickets = async (id) => {
  const deletedTicket = await ReturnTicketModel.findById(id);
  if (!deletedTicket) {
    throw createError("Return Ticket not found", 404);
  }

  // Deduct inventory for each item in the deleted ticket (undo the return)
  for (const item of deletedTicket.items) {
    const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
    if (!inventoryItem) continue; // Should not happen if data integrity is maintained

    inventoryItem.availableQty -= item.quantity; // Deduct the quantity
    inventoryItem.history.push({
      type: "RETURN_DELETE_ROLLBACK",
      stock: item.quantity,
      customerId: deletedTicket.customerId,
      note: `Return ticket ${deletedTicket.ticketNo} deleted, stock deducted`,
      date: new Date(),
    });
    await inventoryItem.save();
  }

  await ReturnTicketModel.findByIdAndDelete(id);

  /* ---------------- UPDATE RUNNING ORDER STATUS ---------------- */
  if (deletedTicket.runningOrderId) {
    await recalculateRunningOrderStatus(deletedTicket.runningOrderId);
  }

  return deletedTicket;
};

export const getReturnTicketById = async (id) => {
  return await ReturnTicketModel.findById(id).populate("createdBy", "name").select("-__v").lean();
};

export const updateReturnTicket = async (id, ticketData) => {
  const { items, deliveredBy, receivedBy, customerId, ...rest } = ticketData;

  /* ---------------- FETCH EXISTING RETURN TICKET ---------------- */
  const existingTicket = await ReturnTicketModel.findById(id);
  if (!existingTicket) {
    throw createError("Return Ticket not found", 404);
  }

  // Determine if inventory needs reconciliation
  const shouldReconcileInventory = items && Array.isArray(items);

  if (shouldReconcileInventory) {
    /* ---------------- ROLLBACK OLD INVENTORY ---------------- */
    for (const oldItem of existingTicket.items) {
      const inventoryItem = await Inventory.findOne({
        itemCode: oldItem.itemCode,
      });

      if (!inventoryItem) continue;

      inventoryItem.availableQty -= oldItem.quantity;

      // We allow negative temporarily during reconciliation if needed, 
      // but usually the items being returned added to stock.
      // Reverting a return means subtracting from stock.

      inventoryItem.history.push({
        type: "RETURN_REVERT",
        stock: oldItem.quantity,
        customerId: customerId || existingTicket.customerId,
        note: `Reverted return from ${existingTicket.ticketNo} (Update)`,
        date: new Date(),
        ticketNo: existingTicket.ticketNo,
      });

      await inventoryItem.save();
    }

    /* ---------------- VALIDATE NEW INVENTORY ---------------- */
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
      if (!inventoryItem) {
        throw createError(`Item with code ${item.itemCode} not found in inventory`, 400);
      }
    }

    /* ---------------- APPLY NEW INVENTORY ---------------- */
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
      if (inventoryItem) {
        inventoryItem.availableQty += item.quantity;
        inventoryItem.history.push({
          type: "RETURN",
          stock: item.quantity,
          customerId: customerId || existingTicket.customerId,
          note: `Updated return via ${existingTicket.ticketNo}`,
          date: new Date(),
          ticketNo: existingTicket.ticketNo,
        });
        await inventoryItem.save();
      }
    }
  }

  /* ---------------- UPDATE RETURN TICKET ---------------- */
  const updateData = { ...rest };

  if (shouldReconcileInventory) {
    updateData.items = items;
  }

  if (deliveredBy) {
    updateData.deliveredBy = {
      deliveredByName: deliveredBy.deliveredByName ?? existingTicket.deliveredBy?.deliveredByName ?? "",
      deliveredByMobile: deliveredBy.deliveredByMobile ?? existingTicket.deliveredBy?.deliveredByMobile ?? "",
      deliveredDate: deliveredBy.deliveredDate ?? existingTicket.deliveredBy?.deliveredDate ?? null,
    };
  }

  if (receivedBy) {
    updateData.receivedBy = {
      receivedByName: receivedBy.receivedByName ?? existingTicket.receivedBy?.receivedByName ?? "",
      receivedByMobile: receivedBy.receivedByMobile ?? existingTicket.receivedBy?.receivedByMobile ?? "",
      qatarId: receivedBy.qatarId ?? existingTicket.receivedBy?.qatarId ?? "",
      receivedDate: receivedBy.receivedDate ?? existingTicket.receivedBy?.receivedDate ?? null,
    };
  }

  if (customerId) updateData.customerId = customerId;

  existingTicket.set(updateData);
  await existingTicket.save();

  /* ---------------- UPDATE RUNNING ORDER STATUS ---------------- */
  if (existingTicket.runningOrderId) {
    await recalculateRunningOrderStatus(existingTicket.runningOrderId);
  }

  return existingTicket;
};
