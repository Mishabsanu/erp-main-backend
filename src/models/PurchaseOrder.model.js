import mongoose from "mongoose";

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    itemCode: {
      type: String,
      required: true,
    },
    orderedQty: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    items: {
      type: [purchaseOrderItemSchema],
      required: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_DELIVERED", "COMPLETED"],
      default: "OPEN",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const PurchaseOrder = mongoose.model(
  "PurchaseOrder",
  purchaseOrderSchema
);
