import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceNo: { type: String, trim: true }, // PAY-XXXXX or EXP-XXXXX
    referenceType: { type: String, trim: true },
    modeOfPayment: { type: String, trim: true },
    companyName: { type: String, trim: true },
    handledBy: { type: String, trim: true }, // Paid by or Collected by
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Ledger = mongoose.model("Ledger", ledgerSchema);
