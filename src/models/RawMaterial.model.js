import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    itemCode: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    unit: { type: String, required: true }, // e.g., "kg", "liter", "meter"
    availableQty: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10 },
    isInitialized: { type: Boolean, default: false },
    history: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["ADD_STOCK", "STOCK_ADJUSTMENT", "CONSUMPTION", "INITIALIZATION"], default: "STOCK_ADJUSTMENT" },
        quantity: { type: Number, required: true },
        note: { type: String },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const RawMaterial = mongoose.model("RawMaterial", rawMaterialSchema);
