import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    expenseId: { type: String, unique: true },
    date: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    paidTotal: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    modeOfPayment: { 
      type: String, 
      required: true,
      enum: ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'Other']
    },
    // Mode specific fields
    chequeNo: { type: String, trim: true },
    chequeDate: { type: String, trim: true },
    bank: { type: String, trim: true },
    transactionId: { type: String, trim: true },
    voucherNo: { type: String, trim: true },
    
    referenceNo: { type: String, trim: true },
    description: { type: String, trim: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    
    // New Traceability Fields
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    handledById: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
    contactPerson: { type: String, trim: true },
    paidBy: { type: String, trim: true },

    status: { 
      type: String, 
      default: 'paid',
      enum: ['pending', 'paid', 'partially_paid', 'cancelled']
    },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [{ 
      name: String,
      url: String,
      type: { type: String, enum: ['bill', 'receipt', 'proof'] }
    }],
    companyName: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Expense = mongoose.model("Expense", expenseSchema);
