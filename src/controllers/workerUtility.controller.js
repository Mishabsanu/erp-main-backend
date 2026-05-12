import { WorkerUtility } from "../models/WorkerUtility.model.js";
import { UtilityItem } from "../models/UtilityItem.model.js";
import { createError } from "../utils/AppError.js";
import mongoose from "mongoose";

export const issueUtility = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { utilityItemId, quantity = 1, worker } = req.body;

    if (utilityItemId) {
      const masterItem = await UtilityItem.findById(utilityItemId).session(session);
      if (!masterItem) throw createError("Utility master item not found", 404);
      if (masterItem.quantity < quantity) {
        throw createError(`Insufficient stock. Available: ${masterItem.quantity}`, 400);
      }
      masterItem.quantity -= quantity;
      await masterItem.save({ session });
    }

    const utility = await WorkerUtility.create([{
      ...req.body,
      createdBy: req.user?._id,
    }], { session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ success: true, data: utility[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const issueBulkUtilities = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, workerId, force } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw createError("No items provided for issuance", 400);
    }

    // 1. Process Stock Reductions and Validations
    for (const item of items) {
      let targetId = item.utilityItemId;
      
      // Fallback: If utilityItemId is missing, try to find by name and size
      if (!targetId && item.itemName) {
        const found = await UtilityItem.findOne({ name: item.itemName, size: item.size || "N/A" }).session(session);
        if (found) targetId = found._id;
      }

      if (targetId) {
        // If it's a linked master item, check and reduce stock
        const masterItem = await UtilityItem.findById(targetId).session(session);
        if (!masterItem) {
          throw createError(`Utility Item ${item.itemName} not found in master stock.`, 404);
        }
        if (masterItem.quantity < item.quantity) {
          throw createError(`Insufficient stock for ${masterItem.name}. Available: ${masterItem.quantity}, Requested: ${item.quantity}`, 400);
        }

        // Atomically decrement stock
        masterItem.quantity -= item.quantity;
        await masterItem.save({ session });
        
        // Ensure the ID is saved in the record
        item.utilityItemId = targetId;
      }
    }

    // 2. Conflict Check (if not forced)
    if (!force) {
      const activeItems = await WorkerUtility.find({
        worker: workerId,
        status: "issued",
        itemName: { $in: items.map(i => i.itemName) }
      }).session(session);

      if (activeItems.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          success: false,
          message: "Conflict detected: Some items are already active in the worker's ledger.",
          conflicts: activeItems.map(ai => ai.itemName)
        });
      }
    }

    // 3. Create WorkerUtility records
    const createdItems = await WorkerUtility.insertMany(
      items.map(item => ({
        ...item,
        worker: workerId,
        createdBy: req.user?._id,
        recoveryStatus: item.isRecoverable ? "pending" : "none"
      })),
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ success: true, data: createdItems });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getWorkerUtilities = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const utilities = await WorkerUtility.find({ worker: workerId })
      .sort({ issueDate: -1 })
      .populate("createdBy", "name");
    res.status(200).json({ success: true, data: utilities });
  } catch (error) {
    next(error);
  }
};

export const deleteUtility = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const utility = await WorkerUtility.findById(req.params.id).session(session);
    if (!utility) throw createError("Utility record not found", 404);

    // If it was "issued", return quantity to stock
    if (utility.status === "issued" && utility.utilityItemId) {
      await UtilityItem.findByIdAndUpdate(
        utility.utilityItemId,
        { $inc: { quantity: utility.quantity } },
        { session }
      );
    }

    await WorkerUtility.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, message: "Utility record deleted and stock returned" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const updateUtilityStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { status, remarks } = req.body;
    const oldRecord = await WorkerUtility.findById(req.params.id).session(session);
    if (!oldRecord) throw createError("Utility record not found", 404);

    // If changing from "issued" to "returned", increase stock
    if (oldRecord.status === "issued" && status === "returned" && oldRecord.utilityItemId) {
      await UtilityItem.findByIdAndUpdate(
        oldRecord.utilityItemId,
        { $inc: { quantity: oldRecord.quantity } },
        { session }
      );
    } 
    // If changing from "returned" back to "issued", decrease stock
    else if (oldRecord.status !== "issued" && status === "issued" && oldRecord.utilityItemId) {
      const master = await UtilityItem.findById(oldRecord.utilityItemId).session(session);
      if (master && master.quantity >= oldRecord.quantity) {
        master.quantity -= oldRecord.quantity;
        await master.save({ session });
      } else {
        throw createError("Insufficient stock to re-issue this item", 400);
      }
    }

    const utility = await WorkerUtility.findByIdAndUpdate(
      req.params.id,
      { status, remarks },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, data: utility });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getGlobalUtilityStats = async (req, res, next) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const stats = await WorkerUtility.aggregate([
      { $match: { issueDate: { $gte: oneYearAgo } } },
      {
        $group: {
          _id: "$itemName",
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
