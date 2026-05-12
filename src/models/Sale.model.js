import mongoose from "mongoose";
const salesSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    ticketNo: { type: String, trim: true, required: true,uniq:true},
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
    },
    status: {
      type: String,
      enum: [
        "New Lead",
        "Call Required",
        "Contacted",
        "Follow-Up",
        "Quotation Sent",
        "Negotiation",
        "Interested",
        "Not Interested",
        "On Hold",
        "PO Received",
        "Payment Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Request to Developer",
      ],
      default: "New Lead",
    },
    contactPersonMobile: { type: String, required: true, trim: true },
    contactThrough: {
      type: String,
      enum: ["Email", "Phone", "WhatsApp", "Both", "Other"],
      default: "Other",
    },
    referenceNo: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    date: { type: String, required: true },
    nextFollowUpDate: { type: String },
    remarks: { type: String, trim: true },
    businessType: { type: String, trim: true },
    contactedBy: { type: String, trim: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followUpHistory: [
      {
        status: String,
        followUpDate: String,
        remarks: String,
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    attachments: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Sale = mongoose.model("Sale", salesSchema);
