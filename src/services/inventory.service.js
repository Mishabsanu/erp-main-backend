import { Inventory } from "../models/Inventory.model.js";
import { createError } from "../utils/AppError.js";
import mongoose from "mongoose";

export const getAllInventories = async ({
  page = 1,
  limit = 10,
  search = "",
  status,
  poNo,
  product,
  itemCode,
  vendor, // Added vendor filter
  minStock,
  maxStock,
  onlyLowStock,
}) => {
  const match = {};

  if (status) match.status = status;
  if (poNo) match.poNo = poNo;
  if (product) match.product = new mongoose.Types.ObjectId(product);
  if (itemCode) match.itemCode = itemCode;
  if (vendor) match.vendor = new mongoose.Types.ObjectId(vendor);

  if (minStock !== undefined || maxStock !== undefined) {
    match.availableQty = {};
    if (minStock !== undefined) match.availableQty.$gte = Number(minStock);
    if (maxStock !== undefined) match.availableQty.$lte = Number(maxStock);
  }

  const pipeline = [
    { $match: match },
    // Convert ID to string for searching
    { $addFields: { idStr: { $toString: "$_id" } } },
    // Lookup Product
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productDoc",
      },
    },
    { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
    // Lookup Vendor
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendorDoc",
      },
    },
    { $unwind: { path: "$vendorDoc", preserveNullAndEmptyArrays: true } },
    // Lookup CreatedBy
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creatorDoc",
      },
    },
    { $unwind: { path: "$creatorDoc", preserveNullAndEmptyArrays: true } },
  ];

  // Apply search
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    const idSearch = search.toLowerCase().startsWith("inv-") 
      ? search.slice(4) 
      : search;
    const idSearchRegex = { $regex: idSearch, $options: "i" };
      
    pipeline.push({
      $match: {
        $or: [
          { poNo: searchRegex },
          { itemCode: searchRegex },
          { "productDoc.name": searchRegex },
          { "vendorDoc.company": searchRegex },
          { idStr: idSearchRegex },
        ],
      },
    });
  }

  const skip = (page - 1) * limit;

  // Add projection and calculated fields
  pipeline.push({
    $addFields: {
      totalSold: { $subtract: ["$orderedQty", "$availableQty"] },
      isLowStock: {
        $and: [
          { $lte: ["$availableQty", { $ifNull: ["$productDoc.reorderLevel", 0] }] },
          { $gt: ["$availableQty", 0] }
        ]
      },
      status: {
        $cond: {
          if: { $eq: ["$availableQty", 0] },
          then: "OUT_OF_STOCK",
          else: {
            $cond: {
              if: { $lte: ["$availableQty", { $ifNull: ["$productDoc.reorderLevel", 0] }] },
              then: "LOW_STOCK",
              else: "IN_STOCK"
            }
          }
        }
      }
    }
  });

  // Final cleanup and formatting
  pipeline.push({
    $project: {
      product: "$productDoc",
      vendor: "$vendorDoc",
      createdBy: "$creatorDoc",
      poNo: 1,
      itemCode: 1,
      orderedQty: 1,
      availableQty: 1,
      status: 1,
      totalSold: 1,
      isLowStock: 1,
      createdAt: 1,
      updatedAt: 1,
    }
  });

  // Execute with count
  const results = await Inventory.aggregate([
    ...pipeline,
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: Number(limit) }],
      },
    },
  ]);

  const totalCount = results[0].metadata[0]?.total || 0;
  let finalData = results[0].data;

  // Filter if onlyLowStock is requested
  if (onlyLowStock === "true") {
    finalData = finalData.filter(item => item.isLowStock || item.status === "OUT_OF_STOCK");
  }

  return {
    content: finalData,
    totalCount: onlyLowStock === "true" ? finalData.length : totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    limit,
  };
};

export const createInventory = async (data) => {
  const { poNo, items, vendor, reference, remarks, deliveryNote, productImage } = data;

  if (!items?.length) {
    throw createError("Items are required", 400);
  }

  const createdInventories = [];

  for (const item of items) {
    const { productId, itemCode, quantity, reorderLevel } = item;

    if (!productId || !itemCode || !quantity) {
      throw createError("Invalid item payload", 400);
    }

    // 🔥 Update product reorder level if provided
    if (reorderLevel !== undefined) {
      await mongoose.model("Product").findByIdAndUpdate(productId, { reorderLevel });
    }

    // 🔒 Upsert logic: Find existing inventory for the same Product
    // This allows consolidation of stock for the same product across different entries
    const existing = await Inventory.findOne({
      product: productId,
    });

    if (existing) {
      existing.orderedQty += Number(quantity);
      existing.availableQty += Number(quantity);
      existing.vendor = vendor || existing.vendor; // Update to latest vendor
      if (reference) existing.reference = reference;
      if (remarks) existing.remarks = remarks;
      if (deliveryNote) existing.deliveryNote = deliveryNote;
      if (productImage) existing.productImage = productImage;

      existing.history.push({
        type: "ADD_STOCK",
        stock: quantity,
        vendorId: vendor,
        note: `Stock added to existing record (PO: ${poNo || 'N/A'})`,
      });

      await existing.save();
      createdInventories.push(existing.toObject());
    } else {
      const inventory = await Inventory.create({
        poNo,
        product: productId,
        vendor,
        itemCode,
        reference,
        remarks,
        deliveryNote,
        productImage,
        orderedQty: quantity,
        availableQty: quantity,
        createdBy: data.createdBy,
        history: [
          {
            type: "ADD_STOCK",
            stock: quantity,
            vendorId: vendor,
            note: `Inventory created (PO: ${poNo || 'N/A'})`,
          },
        ],
      });
      createdInventories.push(inventory.toObject());
    }
  }

  return createdInventories;
};

export const updateInventory = async (id, data) => {
  const inventory = await Inventory.findById(id);
  if (!inventory) throw createError("Inventory not found", 404);

  const { orderedQty, note = "Inventory updated" } = data;

  // 🔒 Ensure Product uniqueness if changed
  if (data.product) {
    const product = data.product || inventory.product;

    const exists = await Inventory.findOne({
      product,
      _id: { $ne: id },
    });

    if (exists) {
      throw createError(
        "Inventory record for this Product already exists. Please update the existing record instead.",
        400
      );
    }
  }

  // 🔥 Handle quantity delta
  if (orderedQty !== undefined) {
    const qtyNum = Number(orderedQty);
    if (isNaN(qtyNum)) throw createError("Invalid quantity", 400);

    const diff = qtyNum - inventory.orderedQty;

    inventory.orderedQty = qtyNum;
    inventory.availableQty += diff;

    if (inventory.availableQty < 0) {
      throw createError("Available quantity cannot be negative", 400);
    }

    inventory.history.push({
      type: "INVENTORY_ADJUSTMENT",
      stock: diff, // Use diff directly to show increase/decrease
      note,
    });
  }

  // 🔥 Update product reorder level if provided
  if (data.reorderLevel !== undefined) {
    await mongoose.model("Product").findByIdAndUpdate(inventory.product, { reorderLevel: Number(data.reorderLevel) });
  }

  // Safe updates
  ["poNo", "product", "itemCode", "reference"].forEach((field) => {
    if (data[field] !== undefined) inventory[field] = data[field];
  });

  await inventory.save();

  const obj = inventory.toObject();
  delete obj.__v;
  return obj;
};

export const getInventoryById = async (id) => {
  const pipeline = [
    {
      $match: { _id: new mongoose.Types.ObjectId(id) },
    },

    // Product
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Vendor
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: {
        path: "$vendor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 🔥 Customers for history
    {
      $lookup: {
        from: "customers",
        localField: "history.customerId",
        foreignField: "_id",
        as: "historyCustomers",
      },
    },

    // 🔥 Merge customer into each history item
    {
      $addFields: {
        history: {
          $map: {
            input: "$history",
            as: "h",
            in: {
              $mergeObjects: [
                "$$h",
                {
                  customer: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$historyCustomers",
                          as: "c",
                          cond: { $eq: ["$$c._id", "$$h.customerId"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },

    {
      $project: {
        historyCustomers: 0,
        __v: 0,
      },
    },
  ];

  const result = await Inventory.aggregate(pipeline);
  return result[0] || null;
};

export const deleteInventory = async (id) => {
  const deleted = await Inventory.findByIdAndDelete(id);
  return deleted;
};

export const getInventoryDropdown = async () => {
  // Use aggregation to filter by populated product status
  return Inventory.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productDoc",
      },
    },
    { $unwind: "$productDoc" },
    { $match: { "productDoc.status": "active" } },
    {
      $project: {
        poNo: 1,
        itemCode: 1,
        product: "$productDoc",
      },
    },
  ]);
};

export const getAvailableProducts = async () => {
  const productsInInventory = await Inventory.aggregate([
    {
      $match: {
        status: { $in: ["IN_STOCK", "LOW_STOCK"] },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $project: {
        _id: 1,
        productId: "$productInfo._id",
        name: "$productInfo.name",
        itemCode: "$productInfo.itemCode",
        unit: "$productInfo.unit",
        availableQty: "$availableQty",
        orderedQty: "$orderedQty",
        status: 1,
      },
    },
  ]);

  return productsInInventory;
};
