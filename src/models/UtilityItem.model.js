import mongoose from "mongoose";

const utilityItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Safety Gear", "Uniform", "Tools", "Industrial Gear", "Other"],
      default: "Safety Gear",
    },
    size: {
      type: String, // e.g., XL, 42, 10, N/A
      trim: true,
      default: "N/A",
    },
    rate: {
      type: Number,
      required: true,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    minStockLevel: {
      type: Number,
      default: 5,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    groupId: {
      type: String, // Groups associated variants together
      index: true,
    },
    isVariant: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const UtilityItem = mongoose.model("UtilityItem", utilityItemSchema);
