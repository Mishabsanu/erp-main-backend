import mongoose from "mongoose";

const rawMaterialMovementSchema = new mongoose.Schema(
  {
    material: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "RawMaterial", 
      required: true 
    },
    type: { 
      type: String, 
      enum: ["ADD_STOCK", "STOCK_ADJUSTMENT", "CONSUMPTION", "INITIALIZATION", "PRODUCTION_CONSUMPTION", "PRODUCTION_REVERT"], 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true 
    }, // Positive for additions, negative for consumption
    previousQty: {
      type: Number,
      required: true
    },
    currentQty: {
      type: Number,
      required: true
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'onModel'
    },
    onModel: {
      type: String,
      enum: ['Production', 'RawMaterial']
    },
    note: { 
      type: String 
    },
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  },
  { timestamps: true }
);

export const RawMaterialMovement = mongoose.model("RawMaterialMovement", rawMaterialMovementSchema);
