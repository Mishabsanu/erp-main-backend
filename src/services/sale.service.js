import csv from "csv-parser";
import fs from "fs";
import mongoose from "mongoose";
import pLimit from "p-limit";
import { Readable } from "stream";
import { Sale } from "../models/Sale.model.js";
import { mapRowToSale } from "../utils/mapRowToSale.js";
import { deleteFile } from "../helper/cloudinaryHelper.js";
import { formatToDDMMYYYY } from "../utils/toISODate.js";

import { startOfDay, endOfDay, format, isValid } from 'date-fns';

const safeParseDate = (dateVal, fallback = null, isEnd = false) => {
  if (!dateVal) return fallback;
  const d = new Date(dateVal);
  if (!isValid(d)) return fallback;

  if (dateVal === "") return fallback;

  if (typeof dateVal === 'string' && dateVal.includes('T')) {
    return d;
  }

  return isEnd ? endOfDay(d) : startOfDay(d);
};

const concurrency = pLimit(10);

export const getAll = async (
  user,
  {
    page = 1,
    limit = 10,
    status,
    search = "",
    startDate = "",
    endDate = "",
    nextFollowUpDate = "",
  }
) => {
  const matchQuery = {};

  // Role-based data isolation
  const roleName = (typeof user.role === 'object' ? user.role?.name : user.role)?.toLowerCase() || "";
  const isAdmin = roleName === "admin" || roleName === "super admin";

  if (!isAdmin) {
    matchQuery.$or = [
      { user: new mongoose.Types.ObjectId(user.id) },
      { createdBy: new mongoose.Types.ObjectId(user.id) }
    ];
  }

  // Search filter
  if (search) {
    matchQuery.$or = [
      { ticketNo: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { businessType: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { contactPersonMobile: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    matchQuery.status = status;
  }

  if (nextFollowUpDate) {
    const dFollow = safeParseDate(nextFollowUpDate);
    if (dFollow) {
      const f1 = format(dFollow, 'dd-MM-yyyy');
      const f2 = format(dFollow, 'yyyy-MM-dd');
      matchQuery.nextFollowUpDate = { $in: [f1, f2] };
    }
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $addFields: {
        normalizedDate: {
          $replaceAll: {
            input: { $ifNull: ["$date", ""] },
            find: "/",
            replacement: "-"
          }
        }
      }
    },
    {
      $addFields: {
        parsedEnquiryDate: {
          $let: {
            vars: {
              parsedDate: {
                $switch: {
                  branches: [
                    {
                      case: { $regexMatch: { input: "$normalizedDate", regex: /^\d{1,2}-\d{1,2}-\d{2,4}$/ } },
                      then: { $dateFromString: { dateString: "$normalizedDate", format: "%d-%m-%Y", onError: null } }
                    },
                    {
                      case: { $regexMatch: { input: "$normalizedDate", regex: /^\d{2,4}-\d{1,2}-\d{1,2}$/ } },
                      then: { $dateFromString: { dateString: "$normalizedDate", format: "%Y-%m-%d", onError: null } }
                    }
                  ],
                  default: null
                }
              }
            },
            in: { $ifNull: ["$$parsedDate", "$createdAt"] }
          }
        },
      },
    },
  ];

  const isAllTime = startDate === "" || startDate === "null" || startDate === "undefined";

  if (!isAllTime && (startDate || endDate)) {
    const dStart = safeParseDate(startDate, null);
    const dEnd = safeParseDate(endDate, null, true);

    const dateMatch = {};
    if (dStart && dEnd) {
      dateMatch.parsedEnquiryDate = { $gte: dStart, $lte: dEnd };
    } else if (dStart) {
      dateMatch.parsedEnquiryDate = { $gte: dStart };
    } else if (dEnd) {
      dateMatch.parsedEnquiryDate = { $lte: dEnd };
    }

    if (Object.keys(dateMatch).length > 0) {
      pipeline.push({ $match: dateMatch });
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const limitNum = Number(limit);

  const [totalResult, sales] = await Promise.all([
    Sale.aggregate([...pipeline, { $count: "total" }]),
    Sale.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
          "createdBy.password": 0,
          "createdBy.__v": 0,
        },
      },
    ]),
  ]);

  const totalCount = totalResult[0]?.total || 0;

  return {
    content: sales,
    totalCount,
    totalPages: Math.ceil(totalCount / limitNum),
    currentPage: Number(page),
  };
};

export const getStats = async (
  user,
  { search = "", startDate = "", endDate = "", nextFollowUpDate = "" }
) => {
  const matchQuery = {};

  // Role-based data isolation
  const roleName = (typeof user.role === 'object' ? user.role?.name : user.role)?.toLowerCase() || "";
  const isAdmin = roleName === "admin" || roleName === "super admin";

  if (!isAdmin) {
    matchQuery.$or = [
      { user: new mongoose.Types.ObjectId(user.id) },
      { createdBy: new mongoose.Types.ObjectId(user.id) }
    ];
  }

  // Search filter
  if (search) {
    matchQuery.$or = [
      { ticketNo: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { businessType: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { contactPersonMobile: { $regex: search, $options: "i" } },
    ];
  }

  if (nextFollowUpDate) {
    const dFollow = safeParseDate(nextFollowUpDate);
    if (dFollow) {
      const f1 = format(dFollow, "dd-MM-yyyy");
      const f2 = format(dFollow, "yyyy-MM-dd");
      matchQuery.nextFollowUpDate = { $in: [f1, f2] };
    }
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $addFields: {
        normalizedDate: {
          $replaceAll: {
            input: { $ifNull: ["$date", ""] },
            find: "/",
            replacement: "-",
          },
        },
      },
    },
    {
      $addFields: {
        parsedEnquiryDate: {
          $let: {
            vars: {
              parsedDate: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $regexMatch: {
                          input: "$normalizedDate",
                          regex: /^\d{1,2}-\d{1,2}-\d{2,4}$/,
                        },
                      },
                      then: {
                        $dateFromString: {
                          dateString: "$normalizedDate",
                          format: "%d-%m-%Y",
                          onError: null,
                        },
                      },
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: "$normalizedDate",
                          regex: /^\d{2,4}-\d{1,2}-\d{1,2}$/,
                        },
                      },
                      then: {
                        $dateFromString: {
                          dateString: "$normalizedDate",
                          format: "%Y-%m-%d",
                          onError: null,
                        },
                      },
                    },
                  ],
                  default: null,
                },
              },
            },
            in: { $ifNull: ["$$parsedDate", "$createdAt"] },
          },
        },
      },
    },
  ];

  const isAllTime =
    startDate === "" || startDate === "null" || startDate === "undefined";

  if (!isAllTime && (startDate || endDate)) {
    const dStart = safeParseDate(startDate, null);
    const dEnd = safeParseDate(endDate, null, true);

    const dateMatch = {};
    if (dStart && dEnd) {
      dateMatch.parsedEnquiryDate = { $gte: dStart, $lte: dEnd };
    } else if (dStart) {
      dateMatch.parsedEnquiryDate = { $gte: dStart };
    } else if (dEnd) {
      dateMatch.parsedEnquiryDate = { $lte: dEnd };
    }

    if (Object.keys(dateMatch).length > 0) {
      pipeline.push({ $match: dateMatch });
    }
  }

  const stats = await Sale.aggregate([
    ...pipeline,
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const todayStr = format(new Date(), "dd-MM-yyyy");
  const todayAltStr = format(new Date(), "yyyy-MM-dd");
  
  const todayFollowUpCount = await Sale.countDocuments({
    ...matchQuery,
    nextFollowUpDate: { $in: [todayStr, todayAltStr] }
  });

  const result = {
    "All Statuses": 0,
    "New Lead": 0,
    "Call Required": 0,
    "Interested": 0,
    "Today Follow-up": todayFollowUpCount
  };

  let total = 0;
  stats.forEach((item) => {
    if (item._id) {
      result[item._id] = item.count;
      total += item.count;
    }
  });

  result["All Statuses"] = total;

  return result;
};

export const getAllLastEnquiries = async (user, { search = "" }) => {
  const query = {};

  const roleName = (typeof user.role === 'object' ? user.role?.name : user.role)?.toLowerCase() || "";
  const isAdmin = roleName === "admin" || roleName === "super admin";

  if (!isAdmin) {
    query.$or = [
      { user: user.id },
      { createdBy: user.id }
    ];
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { contactPersonMobile: { $regex: search, $options: "i" } },
      { ticketNo: { $regex: search, $options: "i" } },
    ];
  }

  const sales = await Sale.find(query)
    .populate("user", "name email")
    .populate("followUpHistory.updatedBy", "name email") 
    .sort({ createdAt: -1 });

  return sales;
};

export const getById = async (id) => {
  return await Sale.findById(id)
    .populate("user", "name email")
    .populate("createdBy", "name email")
    .populate("followUpHistory.updatedBy", "name email");
};

export const create = async (data, user) => {
  const enquiryDate = formatToDDMMYYYY(data.date);
  const followUpDate = formatToDDMMYYYY(data.followUpDate);
  const newSale = await Sale.create({
    ...data,
    date: enquiryDate,
    nextFollowUpDate: followUpDate,
    user: new mongoose.Types.ObjectId(user.id),
    createdBy: new mongoose.Types.ObjectId(user.id),
    followUpHistory: [
      {
        status: "New Lead",
        followUpDate: data.followUpDate || null,
        remarks: data.remarks || "",
        updatedBy: user.id,
      },
    ],
  });
  return newSale;
};

export const update = async (id, data, user) => {
  const sale = await Sale.findById(id);
  if (!sale) return null;

  if (user.role !== "admin" && sale.user.toString() !== user.id.toString()) {
    return null;
  }
  delete data.user;
  delete data.followUpHistory;

  if (data.date) {
    data.date = formatToDDMMYYYY(data.date);
  }
  if (data.followUpDate) {
    data.nextFollowUpDate = formatToDDMMYYYY(data.followUpDate);
    delete data.followUpDate;
  }
  Object.assign(sale, data);

  await sale.save();
  return sale;
};

export const remove = async (id, user) => {
  const sale = await Sale.findById(id);
  if (!sale) return null;
  if (user.role !== "admin" && sale.user.toString() !== user.id.toString())
    return null;
  return sale.deleteOne();
};

export const updateStatus = async (
  saleId,
  status,
  nextFollowUpDate,
  remarks,
  userId
) => {
  const sale = await Sale.findById(saleId);
  if (!sale) throw new Error("Sale not found");
  sale.status = status;
  const normalizedFollowUpDate = formatToDDMMYYYY(nextFollowUpDate);
  sale.nextFollowUpDate = normalizedFollowUpDate;
  sale.remarks = remarks;
  sale.followUpHistory.push({
    status,
    followUpDate: normalizedFollowUpDate,
    remarks,
    updatedBy: new mongoose.Types.ObjectId(userId),
  });
  await sale.save();
  return sale;
};

export const getNextTicketNo = async () => {
  const lastSale = await Sale.findOne({
    ticketNo: { $regex: /^TKT-\d+$/ },
  })
    .sort({ ticketNo: -1 })
    .lean();

  let nextNumber = 1;

  if (lastSale?.ticketNo) {
    // Remove "TKT-" and parse number
    const numStr = lastSale.ticketNo.replace("TKT-", "");
    const num = parseInt(numStr, 10);

    if (!isNaN(num)) {
      nextNumber = num + 1;
    }
  }

  return `TKT-${String(nextNumber).padStart(4, "0")}`;
};

const processStream = async (
  stream,
  { deleteAfter = false, filePath, user }
) => {
  if (!user?.id) {
    throw new Error("User context missing for CSV import");
  }

  const parsedRows = [];
  const rowTasks = [];
  const errorDetails = [];
  let invalidCount = 0;
  let rowIndex = 1;

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (row) => {
        rowIndex++;
        const currentRow = rowIndex;

        rowTasks.push(
          concurrency(async () => {
            try {
              const mapped = await mapRowToSale(row, currentRow);

              if (mapped?.errorData) {
                errorDetails.push(mapped);
                invalidCount++;
                return;
              }

              parsedRows.push(mapped);
            } catch (err) {
              errorDetails.push({
                rowNumber: currentRow,
                errorData: [err.message],
              });
              invalidCount++;
            }
          })
        );
      })
      .on("end", resolve)
      .on("error", reject);
  });

  await Promise.all(rowTasks);

  if (!parsedRows.length) {
    if (deleteAfter && filePath) deleteFile(filePath);

    return {
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      invalidRows: invalidCount,
      errorDetails,
    };
  }

  const incomingRefs = parsedRows.map((p) => p.ticketNo);
  const existingSales = await Sale.find(
    { ticketNo: { $in: incomingRefs } },
    { ticketNo: 1 }
  ).lean();

  const existingRefSet = new Set(existingSales.map((s) => s.ticketNo));

  let insertedCount = 0;
  let updatedCount = 0;

  const bulkOps = parsedRows.map((entry) => {
    existingRefSet.has(entry.ticketNo) ? updatedCount++ : insertedCount++;

    return {
      updateOne: {
        filter: { ticketNo: entry.ticketNo },
        update: {
          $set: entry,
          $setOnInsert: {
            user: new mongoose.Types.ObjectId(user.id),
            followUpHistory: [
              {
                status: entry.status || "New Lead",
                followUpDate: entry.nextFollowUpDate || null,
                remarks: entry.remarks || "",
                updatedBy: new mongoose.Types.ObjectId(user.id),
              },
            ],
          },
        },
        upsert: true,
      },
    };
  });

  for (let i = 0; i < bulkOps.length; i += 500) {
    await Sale.bulkWrite(bulkOps.slice(i, i + 500), { ordered: false });
  }

  /** ---- STEP 5: Cleanup ---- */
  if (deleteAfter && filePath) deleteFile(filePath);

  return {
    success: true,
    insertedCount,
    updatedCount,
    invalidRows: invalidCount,
    errorDetails,
  };
};

export const importFromGoogleSheet = async (url, user) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Google sheet");
  const stream = Readable.fromWeb(res.body);
  return await processStream(stream, { user });
};

export const importFromCsvFile = async (file, user) => {
  let stream;
  let deleteAfter = false;
  let filePath = null;

  if (file.buffer) {
    stream = Readable.from(file.buffer);
    // No need to delete a file from disk if it was stored in memory
  } else if (file.path) {
    stream = fs.createReadStream(file.path);
    deleteAfter = true;
    filePath = file.path;
  } else {
    throw new Error("No file buffer or path provided for CSV import.");
  }

  return await processStream(stream, {
    filePath, // This will be null if memory storage is used
    deleteAfter,
    user,
  });
};
