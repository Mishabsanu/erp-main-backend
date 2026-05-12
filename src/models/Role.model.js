import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema(
  {
    create: { type: Boolean, default: false },
    view: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    permissions: {
      // Administration
      user: { type: PermissionSchema, default: () => ({}) },
      role: { type: PermissionSchema, default: () => ({}) },
      
      // CRM
      sales: { type: PermissionSchema, default: () => ({}) },
      running_order: { type: PermissionSchema, default: () => ({}) },
      
      // Inventory & Logistics
      customer: { type: PermissionSchema, default: () => ({}) },
      vendor: { type: PermissionSchema, default: () => ({}) },
      product: { type: PermissionSchema, default: () => ({}) },
      inventory: { type: PermissionSchema, default: () => ({}) },
      delivery_ticket: { type: PermissionSchema, default: () => ({}) },
      return_ticket: { type: PermissionSchema, default: () => ({}) },
      rental_tracking: { type: PermissionSchema, default: () => ({}) },
      
      // Finance & Accounts
      accounts: { type: PermissionSchema, default: () => ({}) },
      ledger: { type: PermissionSchema, default: () => ({}) },
      expense: { type: PermissionSchema, default: () => ({}) },
      payment: { type: PermissionSchema, default: () => ({}) },
      payroll: { type: PermissionSchema, default: () => ({}) },
      salary_breakup: { type: PermissionSchema, default: () => ({}) },
      salary_slip: { type: PermissionSchema, default: () => ({}) },
      invoice: { type: PermissionSchema, default: () => ({}) },

      // HR & Workforce
      worker: { type: PermissionSchema, default: () => ({}) },
      attendance: { type: PermissionSchema, default: () => ({}) },
      leave: { type: PermissionSchema, default: () => ({}) },
      utility: { type: PermissionSchema, default: () => ({}) },

      // Production & Factory
      production: { type: PermissionSchema, default: () => ({}) },
      raw_material: { type: PermissionSchema, default: () => ({}) },
      raw_material_registry: { type: PermissionSchema, default: () => ({}) },
      raw_material_stock: { type: PermissionSchema, default: () => ({}) },

      // Operations & Fleet
      fleet: { type: PermissionSchema, default: () => ({}) },
      mechanical_checkup: { type: PermissionSchema, default: () => ({}) },
      workshop_reports: { type: PermissionSchema, default: () => ({}) },
      facility: { type: PermissionSchema, default: () => ({}) },
      facility_audit: { type: PermissionSchema, default: () => ({}) },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    description: {
      type: String,
      trim: true,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Role = mongoose.model("Role", RoleSchema);
