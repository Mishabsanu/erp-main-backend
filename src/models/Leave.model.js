import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema(
  {
    workerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Worker", 
      required: true 
    },
    type: { 
      type: String, 
      enum: ["Annual", "Sick", "Emergency", "Unpaid", "Other"],
      required: true 
    },
    startDate: { 
      type: Date, 
      required: true 
    },
    endDate: { 
      type: Date, 
      required: true 
    },
    reason: { 
      type: String, 
      required: true,
      trim: true 
    },
    totalDays: {
      type: Number,
      required: true
    },
    relieverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker"
    },
    contactDuringLeave: {
      type: String,
      trim: true
    },
    airTicketRequired: {
      type: Boolean,
      default: false
    },
    exitPermitRequired: {
      type: Boolean,
      default: false
    },
    attachment: { 
      type: String // File path for documents/medical center
    },
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected"], 
      default: "Pending" 
    },
    approvedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    remarks: { 
      type: String, 
      trim: true 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export const Leave = mongoose.model("Leave", LeaveSchema);
