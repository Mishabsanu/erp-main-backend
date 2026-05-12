import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    poNo: {
      type: String,
      required: false,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    itemCode: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
    remarks: {
      type: String,
    },
    deliveryNote: {
      type: String,
    },
    productImage: {
      type: String,
    },
    orderedQty: {
      type: Number,
      required: true, // qty received from PO
    },

    availableQty: {
      type: Number,
      required: true, // remaining stock
    },

    status: {
      type: String,
      enum: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
      default: "IN_STOCK",
    },

    history: [
      {
        type: {
          type: String,
          enum: [
            "ADD_STOCK",
            "PRODUCTION",
            "INVENTORY_ADJUSTMENT",
            "DELIVERY",
            "RETURN",
            "RETURN_REVERT",
            "DELIVERY_ROLLBACK",
            "RETURN_DELETE_ROLLBACK",
            "DELIVERY_DELETE_ROLLBACK",
          ],
          required: true,
        },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
        stock: {
          type: Number,
          required: true,
        },
        ticketNo: String,
        note: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// Remove the unique index to allow multiple null/empty poNo for different products
// But we will handle "upsert" manually in service.
// inventorySchema.index({ poNo: 1, product: 1 }, { unique: true });

inventorySchema.pre("save", function (next) {
  if (this.availableQty === 0) {
    this.status = "OUT_OF_STOCK";
  } else {
    // Note: LOW_STOCK is now handled dynamically in service or UI
    // based on product.reorderLevel
    if (this.status === "OUT_OF_STOCK") this.status = "IN_STOCK";
  }
  next();
});

export const Inventory = mongoose.model("Inventory", inventorySchema);
