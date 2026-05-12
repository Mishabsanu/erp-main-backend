import { UtilityItem } from "../models/UtilityItem.model.js";
import { createError } from "../utils/AppError.js";

export const createUtilityItem = async (req, res, next) => {
  try {
    const item = await UtilityItem.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) {
      return next(createError("SKU already exists", 400));
    }
    next(error);
  }
};

export const getUtilityItems = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = { isActive: true };

    if (category) query.category = category;
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const items = await UtilityItem.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const updateUtilityItem = async (req, res, next) => {
  try {
    const item = await UtilityItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) throw createError("Utility item not found", 404);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const deleteUtilityItem = async (req, res, next) => {
  try {
    const item = await UtilityItem.findByIdAndUpdate(req.params.id, {
      isActive: false,
    });
    if (!item) throw createError("Utility item not found", 404);
    res.status(200).json({ success: true, message: "Item deactivated" });
  } catch (error) {
    next(error);
  }
};

export const createBulkUtilityItems = async (req, res, next) => {
  try {
    const { baseItem, variants } = req.body;
    const groupId = `GRP-${Date.now()}`;

    const itemsToCreate = variants.map((variant) => ({
      ...baseItem,
      ...variant,
      groupId,
      isVariant: true,
      createdBy: req.user?._id,
    }));

    const items = await UtilityItem.insertMany(itemsToCreate);
    res.status(201).json({ success: true, data: items });
  } catch (error) {
    if (error.code === 11000) {
      return next(createError("One or more SKUs already exist", 400));
    }
    next(error);
  }
};

export const getUtilityDropdown = async (req, res, next) => {
  try {
    const items = await UtilityItem.find({ isActive: true, quantity: { $gt: 0 } })
      .select("name category size rate quantity")
      .sort({ name: 1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};
