import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Office A", "Worker Camp 1"
    type: { 
      type: String, 
      enum: ["Office", "Camp", "Room", "Warehouse", "Workshop"], 
      required: true 
    },
    location: { type: String, trim: true },
    capacity: { type: Number },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    lastAuditDate: { type: Date },
    lastAuditStatus: { type: String, enum: ["Compliant", "Issues", "Pending"], default: "Pending" },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Facility = mongoose.model("Facility", facilitySchema);
