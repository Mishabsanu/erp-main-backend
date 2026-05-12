import { DeliveryTicket } from "../models/DeliveryTicket.model.js";
import { Inventory } from "../models/Inventory.model.js";
import { Order } from "../models/RunningOrder.model.js";
import ReturnTicketModel from "../models/ReturnTicket.model.js";
import { createError } from "../utils/AppError.js";

export const recalculateRunningOrderStatus = async (runningOrderId) => {
  if (!runningOrderId) return;

  const order = await Order.findById(runningOrderId);
  if (!order) return;

  const [deliveryTickets, returnTickets] = await Promise.all([
    DeliveryTicket.find({ runningOrderId }),
    ReturnTicketModel.find({ runningOrderId })
  ]);
  
  const deliveryMap = {};
  const returnMap = {};
  
  deliveryTickets.forEach(ticket => {
    ticket.items.forEach(item => {
      const pid = item.productId.toString();
      deliveryMap[pid] = (deliveryMap[pid] || 0) + (item.quantity || 0);
    });
  });

  returnTickets.forEach(ticket => {
    ticket.items.forEach(item => {
      const pid = item.productId.toString();
      const qty = Number(item.returnQty ?? item.quantity) || 0;
      returnMap[pid] = (returnMap[pid] || 0) + qty;
    });
  });

  let allFullyDelivered = true;
  let anyDeliveryMade = false;
  let allFullyReturned = true;
  let anyReturnMade = false;

  const isHire = order.transaction_type === 'Hire' || order.transaction_type === 'Contract';

  if (order.items && order.items.length > 0) {
    order.items.forEach(orderItem => {
      const pid = orderItem.productId.toString();
      const deliveredQty = deliveryMap[pid] || 0;
      const returnedQty = returnMap[pid] || 0;
      
      // Status for individual items
      let itemStatus = "Order Placed";
      if (isHire) {
        if (deliveredQty >= orderItem.quantity && returnedQty >= deliveredQty) {
          itemStatus = "Closed";
        } else if (returnedQty > 0) {
          itemStatus = "Partially Returned";
        } else if (deliveredQty >= orderItem.quantity) {
          itemStatus = "On Hire";
        } else if (deliveredQty > 0) {
          itemStatus = "Partially Completed";
        }
      } else {
        // Sale
        if (deliveredQty >= orderItem.quantity) {
          itemStatus = "Completed";
        } else if (deliveredQty > 0) {
          itemStatus = "Partially Completed";
        }
      }
      
      orderItem.status = itemStatus;

      // Track aggregate flags
      if (deliveredQty < orderItem.quantity) allFullyDelivered = false;
      if (deliveredQty > 0) anyDeliveryMade = true;
      if (returnedQty < deliveredQty) allFullyReturned = false;
      if (returnedQty > 0) anyReturnMade = true;
    });
  } else {
    allFullyDelivered = false;
    allFullyReturned = false;
  }

  let newStatus = "Order Placed";
  if (isHire) {
    if (allFullyDelivered && allFullyReturned && anyDeliveryMade) {
      newStatus = "Closed";
    } else if (anyReturnMade) {
      newStatus = "Partially Returned";
    } else if (allFullyDelivered && anyDeliveryMade) {
      newStatus = "On Hire";
    } else if (anyDeliveryMade) {
      newStatus = "Partially Completed";
    }
  } else {
    // Sale
    if (allFullyDelivered && anyDeliveryMade) {
      newStatus = "Completed";
    } else if (anyDeliveryMade) {
      newStatus = "Partially Completed";
    }
  }

  order.status = newStatus;
  await order.save();
};
export const addDeliveryTicket = async (ticketData) => {
  const { items, ticketNo, deliveredBy, customerId, receivedBy, ...rest } =
    ticketData;
  console.log(ticketData, "ticketData");

  /* ---------------- INVENTORY VALIDATION ---------------- */
  for (const item of items) {
    const inventoryItem = await Inventory.findOne({
      itemCode: item.itemCode,
    });

    if (!inventoryItem) {
      throw createError(
        `Item with code ${item.itemCode} not found in inventory`,
        400
      );
    }

    if (inventoryItem.availableQty < item.quantity) {
      throw createError(`Insufficient stock for item ${item.itemCode}`, 400);
    }
  }

  /* ---------------- BUILD PAYLOAD ---------------- */
  const finalPayload = {
    ...rest,
    ticketNo,
    items: items.map((item) => ({
      ...item,
      description: item.description || "",
    })),
    customerId: customerId,
    deliveredBy: {
      deliveredByName: deliveredBy?.deliveredByName || "",
      deliveredByMobile: deliveredBy?.deliveredByMobile || "",
      deliveredDate: deliveredBy?.deliveredDate || null,
    },

    receivedBy: {
      receivedByName: receivedBy?.receivedByName || "",
      receivedByMobile: receivedBy?.receivedByMobile || "",
      qatarId: receivedBy?.qatarId || "",
      receivedDate: receivedBy?.receivedDate || null,
    },
  };

  /* ---------------- SAVE DELIVERY TICKET ---------------- */
  const savedTicket = await DeliveryTicket.create(finalPayload);

  /* ---------------- UPDATE INVENTORY ---------------- */
  for (const item of items) {
    const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
    if (!inventoryItem) {
      throw createError(
        `Item with code ${item.itemCode} not found in inventory`,
        400
      );
    }

    inventoryItem.availableQty -= item.quantity;
    inventoryItem.history.push({
      type: "DELIVERY",
      stock: item.quantity,
      customerId: customerId,
      note: `Delivered via ${ticketNo}`,
      date: new Date(),
    });
    await inventoryItem.save();
  }

  /* ---------------- UPDATE RUNNING ORDER STATUS ---------------- */
  if (rest.runningOrderId) {
    await recalculateRunningOrderStatus(rest.runningOrderId);
  }

  return savedTicket;
};

export const getDeliveryTickets = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    startDate,
    endDate,
    client_name,
    ticket_no,
    category,
  } = queryParams;

  const query = {};

  if (search) {
    query.$or = [
      { ticketNo: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { poNo: { $regex: search, $options: "i" } },
      { invoiceNo: { $regex: search, $options: "i" } },
      { noteCategory: { $regex: search, $options: "i" } },
      { "deliveredBy.deliveredByName": { $regex: search, $options: "i" } },
      { "receivedBy.receivedByName": { $regex: search, $options: "i" } },
      { projectLocation: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
      { driverName: { $regex: search, $options: "i" } },
      { vehicleNo: { $regex: search, $options: "i" } },
      { "items.name": { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.noteCategory = category;
  }

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }
  if (client_name) {
    query.client_name = { $regex: client_name, $options: "i" };
  }
  if (ticket_no) {
    query.ticket_no = { $regex: ticket_no, $options: "i" };
  }

  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;

  const [tickets, totalCount] = await Promise.all([
    DeliveryTicket.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    DeliveryTicket.countDocuments(query),
  ]);

  return {
    content: tickets,
    totalCount,
    pageNumber,
    pageSize,
  };
};
export const getDeliveryTicketById = async (id) => {
  return await DeliveryTicket.findById(id).populate("createdBy", "name").select("-__v").lean();
};
export const getLatestDeliveryTicketNo = async () => {
  const latest = await DeliveryTicket.findOne()
    .sort({ ticketNo: -1 })
    .lean();
  let nextNo = "DT-00001";
  if (latest?.ticketNo) {
    const lastNumber = parseInt(latest.ticketNo.replace("DT-", ""), 10);

    if (!isNaN(lastNumber)) {
      nextNo = `DT-${String(lastNumber + 1).padStart(5, "0")}`;
    }
  }
  return nextNo;
};

export const getPoNoDropdown = async () => {
  const distinctPoNos = await DeliveryTicket.distinct("poNo");
  distinctPoNos.sort((a, b) => a.localeCompare(b));
  const result = distinctPoNos.map((po) => ({ poNo: po }));
  return result;
};

export const updateDeliveryTicket = async (id, payload) => {
  const { items, deliveredBy, receivedBy, customerId, ...rest } = payload;

  /* ---------------- FETCH EXISTING TICKET ---------------- */
  const existingTicket = await DeliveryTicket.findById(id);
  if (!existingTicket) {
    throw createError("Delivery Ticket not found", 404);
  }

  // Determine if inventory needs reconciliation (only if items are provided and different)
  const shouldReconcileInventory = items && Array.isArray(items);

  if (shouldReconcileInventory) {
    /* ---------------- RESTORE OLD INVENTORY ---------------- */
    for (const oldItem of existingTicket.items) {
      const inventoryItem = await Inventory.findOne({
        itemCode: oldItem.itemCode,
      });
      if (!inventoryItem) continue;

      inventoryItem.availableQty += oldItem.quantity;
      inventoryItem.history.push({
        type: "DELIVERY_ROLLBACK",
        stock: oldItem.quantity,
        customerId: customerId || existingTicket.customerId,
        note: `Reverted delivery from ${existingTicket.ticketNo} (Update)`,
        date: new Date(),
      });
      await inventoryItem.save();
    }

    /* ---------------- VALIDATE NEW INVENTORY ---------------- */
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
      if (!inventoryItem) {
        throw createError(`Item with code ${item.itemCode} not found in inventory`, 400);
      }
      if (inventoryItem.availableQty < item.quantity) {
        throw createError(`Insufficient stock for item ${item.itemCode}`, 400);
      }
    }

    /* ---------------- APPLY NEW INVENTORY ---------------- */
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
      if (inventoryItem) {
        inventoryItem.availableQty -= item.quantity;
        inventoryItem.history.push({
          type: "DELIVERY",
          stock: item.quantity,
          customerId: customerId || existingTicket.customerId,
          note: `Updated delivery via ${existingTicket.ticketNo}`,
          date: new Date(),
        });
        await inventoryItem.save();
      }
    }
  }

  /* ---------------- UPDATE DELIVERY TICKET ---------------- */
  const updateData = { ...rest };

  if (shouldReconcileInventory) {
    updateData.items = items.map((item) => ({
      ...item,
      description: item.description || "",
    }));
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
export const deleteDeliveryTickets = async (id) => {
  const deletedTicket = await DeliveryTicket.findById(id);
  if (!deletedTicket) {
    throw createError("Delivery Ticket not found", 404);
  }

  // Restore inventory for each item in the deleted ticket
  for (const item of deletedTicket.items) {
    const inventoryItem = await Inventory.findOne({ itemCode: item.itemCode });
    if (!inventoryItem) continue; // Should not happen if data integrity is maintained

    inventoryItem.availableQty += item.quantity; // Restore the quantity
    inventoryItem.history.push({
      type: "DELIVERY_DELETE_ROLLBACK",
      stock: item.quantity,
      customerId: deletedTicket.customerId,
      note: `Delivery ticket ${deletedTicket.ticketNo} deleted, stock restored`,
      date: new Date(),
    });
    await inventoryItem.save();
  }

  await DeliveryTicket.findByIdAndDelete(id);

  /* ---------------- UPDATE RUNNING ORDER STATUS ---------------- */
  if (deletedTicket.runningOrderId) {
    await recalculateRunningOrderStatus(deletedTicket.runningOrderId);
  }

  return deletedTicket;
};
