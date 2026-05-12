import { RawMaterial } from "../models/RawMaterial.model.js";
import { createError } from "../utils/AppError.js";
import mongoose from "mongoose";
import { Readable } from "stream";
import fs from "fs";
import csv from "csv-parser";

/**
 * Bulk create raw materials from an array of data
 */
export const bulkCreate = async (materialsData, userId) => {
  const bulkOps = materialsData.map((m) => ({
    updateOne: {
      filter: { itemCode: m.itemCode },
      update: {
        $set: {
          ...m,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdBy: userId,
          createdAt: new Date(),
          availableQty: 0,
          isInitialized: false,
          history: []
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length === 0) return [];
  return RawMaterial.bulkWrite(bulkOps);
};

const processMaterialStream = async (stream, userId) => {
  const results = [];
  const errors = [];
  let rowCount = 0;

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => {
        rowCount++;
        // Check for required fields based on RawMaterial model
        if (data.name && data.itemCode && data.unit) {
          results.push({
            name: data.name,
            itemCode: data.itemCode,
            unit: data.unit,
            description: data.description || "",
            reorderLevel: Number(data.reorderLevel) || 10,
            status: data.status?.toLowerCase() === "inactive" ? "inactive" : "active",
          });
        } else {
          errors.push(`Row ${rowCount}: Name, Item Code and Unit are required`);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  if (results.length === 0) {
    throw createError("No valid raw material data found", 400);
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
  return await processMaterialStream(stream, userId);
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
  return await processMaterialStream(stream, userId);
};
