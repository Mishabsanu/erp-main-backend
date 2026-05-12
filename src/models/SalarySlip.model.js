import mongoose from "mongoose";

const SalarySlipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    paidDays: { type: Number, required: true },
    totalDays: { type: Number, required: true },
    
    // Snapshot of breakup at time of generation
    earningsSnapshot: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      conveyance: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
    },
    deductionsSnapshot: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
    },

    totalEarnings: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },

    status: {
      type: String,
      enum: ["draft", "generated", "paid"],
      default: "generated",
    },
    paymentDate: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Compound index to prevent duplicate slips for same user-month-year
SalarySlipSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export const SalarySlip = mongoose.model("SalarySlip", SalarySlipSchema);
