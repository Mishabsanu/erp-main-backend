import mongoose from "mongoose";

const ProductionSchema = new mongoose.Schema(
  {
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product", 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true,
      min: [0, "Quantity cannot be negative"]
    },
    batchNumber: { 
      type: String, 
      required: true,
      trim: true 
    },
    manufacturingDate: { 
      type: Date, 
      default: Date.now 
    },
    rawMaterials: [
      {
        material: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterial" },
        quantity: { type: Number, required: true }
      }
    ],
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending"
    },
    image: { 
      type: String // File path to the uploaded image
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

export const Production = mongoose.model("Production", ProductionSchema);
