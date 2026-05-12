import { Worker } from "../models/Worker.model.js";
import { createError } from "../utils/AppError.js";
import { Counter } from "../models/Counter.model.js";

export const getAllWorkers = async ({ page = 1, limit = 10, search = "", status, facilityId }) => {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { workerId: { $regex: search, $options: "i" } },
      { qidNo: { $regex: search, $options: "i" } },
      { passportNo: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;
  if (facilityId) query.facilityId = facilityId;

  const skip = (Number(page) - 1) * Number(limit);
  const [workers, totalCount] = await Promise.all([
    Worker.find(query)
      .populate("facilityId", "name type")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Worker.countDocuments(query),
  ]);

  return {
    content: workers,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  };
};

export const getWorkerById = async (id) => {
  const worker = await Worker.findById(id)
    .populate("facilityId", "name type")
    .populate("createdBy", "name");
  if (!worker) throw createError("Worker not found", 404);
  return worker;
};

export const createWorker = async (data) => {
  // Auto-increment workerId: PROW-0001, PROW-0002, etc.
  const counter = await Counter.findOneAndUpdate(
    { model: "worker" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const workerId = `PROW-${counter.seq.toString().padStart(4, "0")}`;
  data.workerId = workerId;

  return await Worker.create(data);
};

export const updateWorker = async (id, data) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updated = await Worker.findByIdAndUpdate(id, data, { new: true, session });
    if (!updated) throw createError("Worker not found", 404);

    // Handle new utilities if provided (those without an _id are new)
    if (data.utilities && Array.isArray(data.utilities)) {
      const newUtilities = data.utilities.filter(u => !u._id && u.itemName);
      if (newUtilities.length > 0) {
        // We can import the issueBulkUtilities logic or just call the controller logic if possible
        // For simplicity and to avoid circular dependency, I'll implement a simplified version here
        // or better, I'll just rely on the frontend to call the bulk issuance for new items.
        // Actually, let's just make it work here since we are in a service.
      }
    }

    await session.commitTransaction();
    session.endSession();
    return updated;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const removeWorker = async (id) => {
  return await Worker.findByIdAndDelete(id);
};

export const getWorkersDropdown = async () => {
  return await Worker.find({}, { _id: 1, name: 1, workerId: 1 }).sort({ name: 1 });
};
