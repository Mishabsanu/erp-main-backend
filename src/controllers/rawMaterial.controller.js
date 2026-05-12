import fs from "fs";
import { Production } from "../models/Production.model.js";
import { convertGoogleSheetUrlToExport } from "../helper/convertSheet.js";
import { RawMaterial } from "../models/RawMaterial.model.js";
import { RawMaterialMovement } from "../models/RawMaterialMovement.model.js";
import * as rawMaterialService from "../services/rawMaterial.service.js";
import { createError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { failResponse, successResponse } from "../utils/response.js";

export const list = asyncHandler(async (req, res) => {
    const { initialized } = req.query;
    const filter = {};
    if (initialized === 'true') {
        filter.isInitialized = true;
    }
    const materials = await RawMaterial.find(filter).sort({ name: 1 });
    return successResponse(res, "Raw materials fetched successfully", 200, materials);
});

export const getDropdown = asyncHandler(async (req, res) => {
    const materials = await RawMaterial.find({ status: 'active' }).select('name _id itemCode availableQty unit').sort({ name: 1 });
    return successResponse(res, "Raw material dropdown fetched", 200, materials);
});

export const create = asyncHandler(async (req, res) => {
    const material = await RawMaterial.create({
        ...req.body,
        createdBy: req.user.id
    });
    
    // If initial stock is provided, log it
    if (req.body.availableQty > 0) {
        await RawMaterialMovement.create({
            material: material._id,
            type: "INITIALIZATION",
            quantity: req.body.availableQty,
            previousQty: 0,
            currentQty: req.body.availableQty,
            reference: material._id,
            onModel: "RawMaterial",
            note: "Initial stock during registration",
            user: req.user.id
        });
        material.isInitialized = true;
        await material.save();
    }

    return successResponse(res, "Raw material registered", 201, material);
});

export const update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const material = await RawMaterial.findByIdAndUpdate(id, req.body, { new: true });
    if (!material) throw createError("Material not found", 404);
    return successResponse(res, "Raw material updated", 200, material);
});


export const remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if used in production
    const usedInProduction = await Production.findOne({ "rawMaterials.material": id });
    if (usedInProduction) {
        throw createError("Cannot delete material: It is being used in production records. Archive it instead.", 400);
    }

    const deleted = await RawMaterial.findByIdAndDelete(id);
    if (!deleted) throw createError("Material not found", 404);
    
    return successResponse(res, "Raw material deleted successfully", 200, {});
});

export const getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const material = await RawMaterial.findById(id);
    if (!material) throw createError("Material not found", 404);
    
    // Fetch movements from separate collection for audit trail
    const movements = await RawMaterialMovement.find({ material: id })
        .populate('user', 'name')
        .sort({ createdAt: -1 });

    // Map movements to match the frontend 'history' expectation
    const history = movements.map(m => ({
        date: m.createdAt,
        type: m.type,
        quantity: m.quantity,
        note: m.note,
        user: m.user
    }));

    const result = material.toObject();
    result.history = history;

    return successResponse(res, "Raw material details fetched", 200, result);
});

export const adjustStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, note, type } = req.body; // positive to add, negative to subtract
    
    if (quantity === undefined || isNaN(quantity)) {
        throw createError("Valid quantity is required", 400);
    }

    const material = await RawMaterial.findById(id);
    if (!material) throw createError("Material not found", 404);

    const previousQty = material.availableQty || 0;
    material.availableQty = previousQty + Number(quantity);
    material.isInitialized = true;

    // determine type if not provided
    const historyType = type || (quantity > 0 ? "ADD_STOCK" : "STOCK_ADJUSTMENT");

    // Create log in the separate movement collection
    await RawMaterialMovement.create({
        material: material._id,
        type: historyType,
        quantity: Number(quantity),
        previousQty,
        currentQty: material.availableQty,
        reference: material._id,
        onModel: "RawMaterial",
        note: note || `Manual adjustment of ${quantity} units`,
        user: req.user.id
    });

    await material.save();

    return successResponse(res, "Stock adjusted successfully", 200, material);
});

export const importRawMaterialsFromGoogleSheet = asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) return failResponse(res, "Google sheet URL required", 400);
    const exportUrl = convertGoogleSheetUrlToExport(url);
    if (!exportUrl) return failResponse(res, "Invalid sheet URL", 400);
    
    const result = await rawMaterialService.importFromGoogleSheet(exportUrl, req.user.id);
    return successResponse(res, "Raw materials imported successfully from Google Sheet", 200, result);
});

export const importRawMaterialsFromCsv = asyncHandler(async (req, res) => {
    if (!req.file) throw createError("Please upload a CSV file", 400);
    
    const result = await rawMaterialService.importFromCsvFile(req.file, req.user.id);
    
    // Cleanup file if it was saved to disk
    if (req.file.path) {
        fs.unlinkSync(req.file.path);
    }
    
    return successResponse(res, "Raw materials imported successfully from CSV", 200, result);
});
