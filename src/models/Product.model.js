import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    itemCode: { type: String, required: true },
    description: { type: String, required: true },
    unit: { type: String, required: true },
    reorderLevel: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", ProductSchema);
