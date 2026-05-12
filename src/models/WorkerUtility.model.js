import mongoose from "mongoose";

const workerUtilitySchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    utilityItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UtilityItem",
    },
    size: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["issued", "returned", "replaced", "expired"],
      default: "issued",
    },
    remarks: {
      type: String,
      trim: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
    isRecoverable: {
      type: Boolean,
      default: false,
    },
    recoveryStatus: {
      type: String,
      enum: ["none", "pending", "recovered", "waived"],
      default: "none",
    },
    recoveryDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const WorkerUtility = mongoose.model("WorkerUtility", workerUtilitySchema);
