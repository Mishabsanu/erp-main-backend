import mongoose from "mongoose";

const mechanicalCheckupSchema = new mongoose.Schema(
  {
    vehicleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vehicle", 
      required: true 
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    odometer: { type: Number, required: true },
    partsCondition: {
      engine: {
        status: { type: String, enum: ["Good", "Fair", "Repair Needed", "Critical"], default: "Good" },
        remarks: { type: String, trim: true }
      },
      oilLevel: {
        status: { type: String, enum: ["OK", "Low", "Needs Change"], default: "OK" },
        remarks: { type: String, trim: true }
      },
      coolantLevel: {
        status: { type: String, enum: ["OK", "Low", "Needs Change"], default: "OK" },
        remarks: { type: String, trim: true }
      },
      battery: {
        status: { type: String, enum: ["Good", "Fair", "Repair Needed", "Critical"], default: "Good" },
        remarks: { type: String, trim: true }
      },
      tires: {
        status: { type: String, enum: ["Good", "Fair", "Repair Needed", "Critical"], default: "Good" },
        remarks: { type: String, trim: true }
      },
      spareTyre: {
        status: { type: String, enum: ["Good", "Fair", "Repair Needed", "Critical"], default: "Good" },
        remarks: { type: String, trim: true }
      },
      brakes: {
        status: { type: String, enum: ["Good", "Fair", "Repair Needed", "Critical"], default: "Good" },
        remarks: { type: String, trim: true }
      },
      lights: {
        status: { type: String, enum: ["Working", "Defective", "Repair Needed"], default: "Working" },
        remarks: { type: String, trim: true }
      },
      suspension: {
        status: { type: String, enum: ["Good", "Fair", "Repair Needed", "Critical"], default: "Good" },
        remarks: { type: String, trim: true }
      },
      wipers: {
        status: { type: String, enum: ["Working", "Defective", "Repair Needed"], default: "Working" },
        remarks: { type: String, trim: true }
      }
    },
    isWaterWashed: { type: Boolean, default: false },
    isClean: { type: Boolean, default: false },
    photos: [{ type: String }], // Store file paths
    remarks: { type: String, trim: true },
    inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { 
      type: String, 
      enum: ["Fit", "Needs Maintenance", "Grounded"], 
      default: "Fit" 
    }
  },
  { timestamps: true }
);

export const MechanicalCheckup = mongoose.model("MechanicalCheckup", mechanicalCheckupSchema);
