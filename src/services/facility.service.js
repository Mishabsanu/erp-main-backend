import { Facility } from "../models/Facility.model.js";
import { FacilityChecklist } from "../models/FacilityChecklist.model.js";
import { createError } from "../utils/AppError.js";

// --- FACILITY SERVICES ---
export const getAllFacilities = async ({ page = 1, limit = 10, search = "", type, status }) => {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }
  if (type) query.type = type;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [facilities, totalCount] = await Promise.all([
    Facility.find(query)
      .populate("managerId", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Facility.countDocuments(query),
  ]);

  return {
    content: facilities,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  };
};

export const getFacilityById = async (id) => {
  const facility = await Facility.findById(id)
    .populate("managerId", "name")
    .populate("createdBy", "name");
  if (!facility) throw createError("Facility not found", 404);
  return facility;
};

export const createFacility = async (data) => {
  return await Facility.create(data);
};

export const updateFacility = async (id, data) => {
  const updated = await Facility.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw createError("Facility not found", 404);
  return updated;
};

export const removeFacility = async (id) => {
  return await Facility.findByIdAndDelete(id);
};

export const getFacilityDropdown = async () => {
  return Facility.find({ status: "active" }, { name: 1, type: 1 });
};

// --- CHECKLIST SERVICES ---
export const getAllChecklists = async ({ page = 1, limit = 10, facilityId, date, search = "" }) => {
  const match = {};
  if (facilityId) match.facilityId = new mongoose.Types.ObjectId(facilityId);
  if (date) match.date = date; // Expecting YYYY-MM-DD

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "facilities",
        localField: "facilityId",
        foreignField: "_id",
        as: "facility",
      },
    },
    { $unwind: "$facility" },
    {
      $lookup: {
        from: "users",
        localField: "inspectorId",
        foreignField: "_id",
        as: "inspector",
      },
    },
    { $unwind: { path: "$inspector", preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { "facility.name": searchRegex },
          { "inspector.name": searchRegex },
          { remarks: searchRegex },
        ],
      },
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const results = await FacilityChecklist.aggregate([
    ...pipeline,
    { $sort: { date: -1, createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: Number(limit) }],
      },
    },
  ]);

  const totalCount = results[0].metadata[0]?.total || 0;
  const content = results[0].data.map(item => ({
    ...item,
    facilityId: item.facility, // Map back for compatibility
    inspectorId: item.inspector,
  }));

  return {
    content,
    totalCount,
    totalPages: Math.ceil(totalCount / Number(limit)),
    currentPage: Number(page),
  };
};

export const createChecklist = async (data) => {
  const checklist = await FacilityChecklist.create(data);
  
  // 🔥 Sync status to Facility for the "Owner View"
  const isPass = 
    checklist.isClean && 
    checklist.isFireSafetyOK && 
    checklist.isWaterAvailable && 
    checklist.isElectricityOK;

  await Facility.findByIdAndUpdate(checklist.facilityId, {
    lastAuditDate: new Date(checklist.date),
    lastAuditStatus: isPass ? "Compliant" : "Issues"
  });

  return checklist;
};

export const getChecklistById = async (id) => {
  const checklist = await FacilityChecklist.findById(id)
    .populate("facilityId", "name type location")
    .populate("inspectorId", "name");
  if (!checklist) throw createError("Audit report not found", 404);
  return checklist;
};

export const updateChecklist = async (id, data) => {
  const updated = await FacilityChecklist.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw createError("Audit report not found", 404);
  return updated;
};

export const removeChecklist = async (id) => {
  return await FacilityChecklist.findByIdAndDelete(id);
};

export const verifyChecklist = async (id, status, userId) => {
  const updated = await FacilityChecklist.findByIdAndUpdate(id, {
    verificationStatus: status,
    verifiedBy: userId,
    verifiedAt: new Date()
  }, { new: true });
  if (!updated) throw createError("Audit report not found", 404);
  return updated;
};
