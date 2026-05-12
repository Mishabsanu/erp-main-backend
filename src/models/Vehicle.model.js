import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Toyota Pickup"
    plateNo: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true }, // e.g., "Pickup", "Truck", "Car"
    model: { type: String, trim: true },
    year: { type: Number },
    engineNo: { type: String, trim: true },
    chassisNo: { type: String, trim: true },
    odometer: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ["active", "maintenance", "inactive"], 
      default: "active" 
    },
    remarks: { type: String, trim: true },
    insuranceExpiry: { type: Date },
    registrationExpiry: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
