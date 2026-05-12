import mongoose from "mongoose";
import { Production } from "../models/Production.model.js";
import { RawMaterial } from "../models/RawMaterial.model.js";
import { RawMaterialMovement } from "../models/RawMaterialMovement.model.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import { deleteFromCloudinary } from "../helper/cloudinaryHelper.js";
import { uploadFilesInBackground } from "../utils/backgroundAttachmentWorker.js";

export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const pipeline = [];

  // Match by status if provided
  if (status) {
    pipeline.push({ $match: { status } });
  }

  // Convert ID to string for searching
  pipeline.push({ $addFields: { idStr: { $toString: "$_id" } } });

  // Lookup Product
  pipeline.push({
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  });
  pipeline.push({ $unwind: { path: "$product", preserveNullAndEmptyArrays: true } });

  // Apply search
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { batchNumber: searchRegex },
          { "product.name": searchRegex },
          { "product.itemCode": searchRegex },
          { idStr: searchRegex },
        ],
      },
    });
  }

  // Fetch with count
  const results = await Production.aggregate([
    ...pipeline,
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: Number(limit) },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "creator",
            },
          },
          { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        ],
      },
    },
  ]);

  const totalCount = results[0].metadata[0]?.total || 0;
  const productions = results[0].data.map(p => ({
    ...p,
    productId: p.product, // Maintain compatibility
    createdBy: p.creator
  }));

  return successResponse(res, "Production reports fetched successfully", 200, {
    content: productions,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const production = await Production.findById(req.params.id)
    .populate("productId", "name itemCode unit")
    .populate("rawMaterials.material", "name itemCode unit")
    .populate("createdBy", "name");
    
  if (!production) throw createError("Production report not found", 404);
  
  return successResponse(res, "Production report fetched successfully", 200, {
    content: production,
  });
});

export const create = asyncHandler(async (req, res) => {
  const { rawMaterials, ...rest } = req.body;
  const parsedRawMaterials = typeof rawMaterials === 'string' ? JSON.parse(rawMaterials) : rawMaterials;

  const productionData = { 
    ...rest, 
    rawMaterials: parsedRawMaterials,
    createdBy: req.user.id 
  };
  
  // Create production record first
  const production = await Production.create(productionData);

  // Verify and Deduct Raw Materials
  if (parsedRawMaterials && parsedRawMaterials.length > 0) {
    for (const rm of parsedRawMaterials) {
      if (!rm.material || !rm.quantity) continue;
      const material = await RawMaterial.findById(rm.material);
      if (!material) continue; // Should have been caught by validation but safety first
      
      const previousQty = material.availableQty;
      // Deduct stock
      material.availableQty -= Number(rm.quantity);
      await material.save();

      // Log movement in separate collection
      await RawMaterialMovement.create({
        material: material._id,
        type: "PRODUCTION_CONSUMPTION",
        quantity: -Number(rm.quantity),
        previousQty,
        currentQty: material.availableQty,
        reference: production._id,
        onModel: "Production",
        note: `Consumed for batch: ${production.batchNumber}`,
        user: req.user.id
      });
    }
  }

  // Trigger background upload if file exists
  if (req.file) {
    uploadFilesInBackground({
      files: req.file,
      model: Production,
      docId: production._id,
      field: "image",
      folder: "production",
      isSingle: true
    });
  }

  return successResponse(res, "Production report created successfully. Stock deducted.", 201, production);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const production = await Production.findById(id);
  if (!production) throw createError("Production record not found", 404);

  const { rawMaterials, ...rest } = req.body;
  const updateData = { ...rest };
  
  if (rawMaterials) {
    updateData.rawMaterials = typeof rawMaterials === 'string' ? JSON.parse(rawMaterials) : rawMaterials;
  }
  
  // Trigger background upload and delete old image
  if (req.file) {
    if (production.image) {
      deleteFromCloudinary(production.image);
    }
    uploadFilesInBackground({
      files: req.file,
      model: Production,
      docId: id,
      field: "image",
      folder: "production",
      isSingle: true
    });
  }

  const updated = await Production.findByIdAndUpdate(id, updateData, { new: true });
  return successResponse(res, "Production record updated successfully.", 200, updated);
});

export const approve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const production = await Production.findById(id).populate("productId");
  if (!production) throw createError("Production report not found", 404);
  if (production.status === 'approved') throw createError("Report already approved", 400);

  // 1. Find or Create Internal Vendor
  const Vendor = mongoose.model("Vendor");
  let internalVendor = await Vendor.findOne({ isInternal: true });
  if (!internalVendor) {
    internalVendor = await Vendor.create({
      company: "Internal Production",
      mobile: "INTERNAL",
      email: "production@akoderp.internal",
      contactPersonName: "System",
      contactPersonMobile: "INTERNAL",
      isInternal: true,
      status: "active",
      createdBy: req.user.id
    });
  }

  // 2. Update Inventory for the final product
  const Inventory = mongoose.model("Inventory");
  let inventory = await Inventory.findOne({ product: production.productId._id });

  if (inventory) {
    // Update existing inventory
    inventory.orderedQty += production.quantity; // Total in-flow increases
    inventory.availableQty += production.quantity; // Real-time stock increases
    inventory.history.push({
      type: "PRODUCTION",
      stock: production.quantity,
      vendorId: internalVendor._id,
      note: `Batch produced: ${production.batchNumber}`,
      date: new Date()
    });
    await inventory.save();
  } else {
    // Create new inventory if it doesn't exist
    inventory = await Inventory.create({
      product: production.productId._id,
      itemCode: production.productId.itemCode,
      vendor: internalVendor._id,
      orderedQty: production.quantity,
      availableQty: production.quantity,
      history: [{
        type: "PRODUCTION",
        stock: production.quantity,
        vendorId: internalVendor._id,
        note: `Initial production batch: ${production.batchNumber}`,
        date: new Date()
      }],
      createdBy: req.user.id
    });
  }

  // 3. Update Production status
  production.status = 'approved';
  await production.save();

  return successResponse(res, "Production report approved and stock updated", 200, production);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const production = await Production.findById(id);
  if (!production) throw createError("Production report not found", 404);
  
  // 1. REVERT RAW MATERIALS (Always happens)
  if (production.rawMaterials && production.rawMaterials.length > 0) {
    for (const rm of production.rawMaterials) {
      if (!rm.material || !rm.quantity) continue;
      const material = await RawMaterial.findById(rm.material);
      if (!material) continue;

      const previousQty = material.availableQty;
      material.availableQty += Number(rm.quantity);
      await material.save();

      // Log reversion in separate collection
      await RawMaterialMovement.create({
        material: material._id,
        type: "PRODUCTION_REVERT",
        quantity: Number(rm.quantity),
        previousQty,
        currentQty: material.availableQty,
        reference: production._id,
        onModel: "Production",
        note: `Reverted from deleted batch: ${production.batchNumber}`,
        user: req.user.id
      });
    }
  }

  // 2. REVERT INVENTORY (Only if approved)
  if (production.status === 'approved') {
    const Inventory = mongoose.model("Inventory");
    const inventory = await Inventory.findOne({ product: production.productId });
    
    if (inventory) {
      inventory.availableQty -= production.quantity;
      inventory.orderedQty -= production.quantity;
      inventory.history.push({
        type: "INVENTORY_ADJUSTMENT",
        stock: -production.quantity,
        note: `Rolled back due to deletion of Batch: ${production.batchNumber}`,
        date: new Date()
      });
      await inventory.save();
    }
  }

  // 3. Delete Image from Cloudinary if exists
  if (production.image) {
    await deleteFromCloudinary(production.image);
  }

  await Production.findByIdAndDelete(id);
  return successResponse(res, "Production report deleted and stock reverted successfully.", 200, {});
});
