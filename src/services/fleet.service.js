import { Vehicle } from "../models/Vehicle.model.js";
import { MechanicalCheckup } from "../models/MechanicalCheckup.model.js";
import { createError } from "../utils/AppError.js";

// --- VEHICLE SERVICES ---
export const getAllVehicles = async ({ page = 1, limit = 10, search = "", status }) => {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { plateNo: { $regex: search, $options: "i" } },
      { model: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [vehicles, totalCount] = await Promise.all([
    Vehicle.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Vehicle.countDocuments(query),
  ]);

  return {
    content: vehicles,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  };
};

export const getVehicleById = async (id) => {
  const vehicle = await Vehicle.findById(id).populate("createdBy", "name");
  if (!vehicle) throw createError("Vehicle not found", 404);
  return vehicle;
};

export const createVehicle = async (data) => {
  return await Vehicle.create(data);
};

export const updateVehicle = async (id, data) => {
  const updated = await Vehicle.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw createError("Vehicle not found", 404);
  return updated;
};

export const removeVehicle = async (id) => {
  return await Vehicle.findByIdAndDelete(id);
};

export const getVehicleDropdown = async () => {
  return Vehicle.find({ status: "active" }, { name: 1, plateNo: 1 });
};

// --- CHECKUP SERVICES ---
export const getAllCheckups = async ({ page = 1, limit = 10, vehicleId, date, startDate, endDate }) => {
  const query = {};
  if (vehicleId) query.vehicleId = vehicleId;
  
  if (date) {
    query.date = date;
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [checkups, totalCount] = await Promise.all([
    MechanicalCheckup.find(query)
      .populate("vehicleId", "name plateNo")
      .populate("inspectorId", "name")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    MechanicalCheckup.countDocuments(query),
  ]);

  return {
    content: checkups,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  };
};

export const createCheckup = async (data) => {
  // Update vehicle odometer if provided
  if (data.odometer && data.vehicleId) {
    await Vehicle.findByIdAndUpdate(data.vehicleId, { odometer: data.odometer });
  }
  return await MechanicalCheckup.create(data);
};

export const getCheckupById = async (id) => {
  return await MechanicalCheckup.findById(id)
    .populate("vehicleId", "name plateNo")
    .populate("inspectorId", "name");
};

export const getLastCheckup = async (vehicleId) => {
  return await MechanicalCheckup.findOne({ vehicleId })
    .sort({ date: -1, createdAt: -1 });
};

export const updateCheckup = async (id, data) => {
  const updated = await MechanicalCheckup.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw createError("Checkup not found", 404);
  return updated;
};

export const removeCheckup = async (id) => {
  return await MechanicalCheckup.findByIdAndDelete(id);
};
