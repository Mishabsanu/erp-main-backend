import { Product } from "../models/Product.model.js";
import { Inventory } from "../models/Inventory.model.js";
import { Production } from "../models/Production.model.js";
import { Order } from "../models/RunningOrder.model.js";
import { createError } from "../utils/AppError.js";
import mongoose from "mongoose";
import { Readable } from "stream";
import fs from "fs";
import csv from "csv-parser";

export const getAll = async ({ page = 1, limit = 10, search = "", status }) => {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { itemCode: { $regex: search, $options: "i" } },
    ];
  }

  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [products, totalCount] = await Promise.all([
    Product.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / Number(limit));

  return {
    content: products,
    totalCount,
    totalPages,
    currentPage: Number(page),
  };
};

export const getById = async (id) => {
  const product = await Product.findById(id).populate("createdBy", "name");
  if (!product) throw createError("Product not found", 404);
  return product;
};

export const create = async (data) => {
  const product = await Product.create(data);
  return product;
};

export const update = async (id, data) => {
  const updated = await Product.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw createError("Product not found", 404);
  return updated;
};

export const remove = async (id) => {
  const deleted = await Product.findByIdAndDelete(id);
  return deleted;
};

export const getDropdown = async () => {
  return Product.find(
    { status: "active" }, // Filter for active only
    {
      name: 1,
      itemCode: 1,
      unit: 1,
      reorderLevel: 1,
    }
  );
};

/**
 * Gets comprehensive history of a product across Inventory, Production, and Orders
 */
export const getHistory = async (productId) => {
  const pid = new mongoose.Types.ObjectId(productId);

  const [inventoryHistory, productionHistory, orderHistory] = await Promise.all([
    // 1. Inventory Movements
    Inventory.find({ product: pid })
      .select("poNo history availableQty orderedQty itemCode vendor")
      .populate("vendor", "name")
      .lean(),

    // 2. Production Records
    Production.find({ productId: pid })
      .select("quantity batchNumber manufacturingDate shift remarks")
      .sort({ manufacturingDate: -1 })
      .lean(),

    // 3. Sales / Running Orders
    Order.find({ "items.productId": pid })
      .select("invoice_number ordered_date client_name company_name items status")
      .sort({ ordered_date: -1 })
      .lean()
  ]);

  // Flatten inventory history to be more useful
  const flattenedInventory = inventoryHistory.flatMap(inv => 
    (inv.history || []).map(h => ({
      ...h,
      poNo: inv.poNo,
      itemCode: inv.itemCode,
      vendor: inv.vendor?.name,
      currentBatchStock: inv.availableQty
    }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter order items to only show relevant product info
  const cleanedOrderHistory = orderHistory.map(order => ({
    ...order,
    items: order.items.filter(item => item.productId.toString() === productId)
  }));

  return {
    inventory: flattenedInventory,
    production: productionHistory,
    orders: cleanedOrderHistory
  };
};

/**
 * Bulk create products from an array of data
 */
export const bulkCreate = async (productsData, userId) => {
  const bulkOps = productsData.map((p) => ({
    updateOne: {
      filter: { itemCode: p.itemCode },
      update: {
        $set: {
          ...p,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdBy: userId,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length === 0) return [];
  return Product.bulkWrite(bulkOps);
};

const processProductStream = async (stream, userId) => {
  const results = [];
  const errors = [];
  let rowCount = 0;

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => {
        rowCount++;
        if (data.name && data.itemCode) {
          results.push({
            name: data.name,
            itemCode: data.itemCode,
            description: data.description || "",
            unit: data.unit || "pcs",
            reorderLevel: Number(data.reorderLevel) || 0,
            status: data.status?.toLowerCase() === "inactive" ? "inactive" : "active",
          });
        } else {
          errors.push(`Row ${rowCount}: Name and Item Code are required`);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  if (results.length === 0) {
    throw createError("No valid product data found", 400);
  }

  const bulkResult = await bulkCreate(results, userId);

  return {
    count: results.length,
    insertedCount: bulkResult.upsertedCount,
    updatedCount: bulkResult.modifiedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
};

export const importFromGoogleSheet = async (url, userId) => {
  const res = await fetch(url);
  if (!res.ok) throw createError("Failed to fetch Google sheet", 400);
  const stream = Readable.fromWeb(res.body);
  return await processProductStream(stream, userId);
};

export const importFromCsvFile = async (file, userId) => {
  let stream;
  if (file.buffer) {
    stream = Readable.from(file.buffer);
  } else if (file.path) {
    stream = fs.createReadStream(file.path);
  } else {
    throw createError("Invalid file provided", 400);
  }
  return await processProductStream(stream, userId);
};
