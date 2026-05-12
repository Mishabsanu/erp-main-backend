import { SalaryBreakup } from "../models/SalaryBreakup.model.js";
import { SalarySlip } from "../models/SalarySlip.model.js";
import { User } from "../models/User.model.js";
import { createError } from "../utils/AppError.js";

/**
 * SALARY BREAKUP SERVICES
 */

export const getSalaryBreakupByUser = async (userId) => {
  return await SalaryBreakup.findOne({ user: userId });
};

export const upsertSalaryBreakup = async (data) => {
  const { user: userId, ...breakupData } = data;
  
  let breakup = await SalaryBreakup.findOne({ user: userId });
  
  if (breakup) {
    Object.assign(breakup, breakupData);
    await breakup.save();
  } else {
    breakup = await SalaryBreakup.create({ user: userId, ...breakupData });
  }
  
  return breakup;
};

export const getAllSalaryBreakups = async () => {
  return await SalaryBreakup.find().populate("user", "name email mobile");
};

/**
 * SALARY SLIP SERVICES
 */

export const generateSalarySlip = async (data) => {
  const { user: userId, month, year, paidDays, totalDays, generatedBy } = data;

  // Check if slip already exists
  const existingSlip = await SalarySlip.findOne({ user: userId, month, year });
  if (existingSlip) {
    throw createError(`Salary slip for ${month}/${year} already exists for this employee`, 400);
  }

  // Get employee's salary breakup
  const breakup = await SalaryBreakup.findOne({ user: userId });
  if (!breakup) {
    throw createError("Salary breakup not defined for this employee. Please define it first.", 400);
  }

  // Calculate earnings and deductions proportional to paid days
  const factor = paidDays / totalDays;

  const earningsSnapshot = {
    basic: Math.round(breakup.basic * factor),
    hra: Math.round(breakup.hra * factor),
    conveyance: Math.round(breakup.conveyance * factor),
    specialAllowance: Math.round(breakup.specialAllowance * factor),
  };

  const deductionsSnapshot = {
    pf: breakup.pf, // Fixed or proportional? Assuming fixed for now as per common Indian practice
    esi: breakup.esi,
    tds: breakup.tds,
    otherDeductions: breakup.otherDeductions,
  };

  const totalEarnings = Object.values(earningsSnapshot).reduce((a, b) => a + b, 0);
  const totalDeductions = Object.values(deductionsSnapshot).reduce((a, b) => a + b, 0);
  const netSalary = totalEarnings - totalDeductions;

  const salarySlip = await SalarySlip.create({
    user: userId,
    month,
    year,
    paidDays,
    totalDays,
    earningsSnapshot,
    deductionsSnapshot,
    totalEarnings,
    totalDeductions,
    netSalary,
    generatedBy,
  });

  return salarySlip;
};

export const getAllSalarySlips = async (query = {}) => {
  const { month, year, user: userId } = query;
  const filter = {};
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (userId) filter.user = userId;

  return await SalarySlip.find(filter)
    .populate("user", "name email mobile")
    .populate("generatedBy", "name")
    .sort({ year: -1, month: -1 });
};

export const getSalarySlipById = async (id) => {
  return await SalarySlip.findById(id)
    .populate("user", "name email mobile")
    .populate("generatedBy", "name");
};

export const deleteSalarySlip = async (id) => {
  return await SalarySlip.findByIdAndDelete(id);
};
