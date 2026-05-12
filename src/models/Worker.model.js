import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    workerId: { type: String, required: true, unique: true, trim: true }, // Internal ID
    name: { type: String, required: true, trim: true },
    nationality: { type: String, trim: true },
    designation: { type: String, trim: true }, // e.g., "Driver", "Helper", "Mechanic"
    mobile: { type: String, trim: true },
    passportNo: { type: String, trim: true },
    qidNo: { type: String, trim: true }, // Qatar ID
    qidExpiryDate: { type: String }, 
    passportExpiryDate: { type: String },
    joinDate: { type: String },
    dateOfBirth: { type: String },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" }, // Current Camp/Room
    photo: { type: String },
    cv: { type: String },
    qidDoc: { type: String },
    passportDoc: { type: String },
    insuranceDoc: { type: String },
    healthCardDoc: { type: String },
    skills: [
      {
        skillName: { type: String, trim: true },
        certificateDoc: { type: String }
      }
    ],
    documents: [
      {
        docType: { type: String, enum: ["Passport", "QID", "Contract", "Other"] },
        filePath: { type: String },
        expiryDate: { type: String }
      }
    ],
    status: { type: String, enum: ["active", "on_leave", "resigned"], default: "active" },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Worker = mongoose.model("Worker", workerSchema);
