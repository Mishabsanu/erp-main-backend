import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      trim: true,
    },
    client_name: {
      type: String,
      trim: true,
    },
    ordered_date: {
      type: Date,
      required: true,
    },
    order_number: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    invoice_number: {
      type: String,
      trim: true,
      required: true,
    },
    sales_person: {
      type: String,
      trim: true,
    },
    project_location: {
      type: String,
      trim: true,
    },
    po_number: {
      type: String,
      trim: true,
    },
    invoice_amount: {
      type: Number,
    },
    advance_payment: {
      type: Number,
      default: 0,
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        itemCode: String,
        description: String,
        unit: String,
        quantity: { type: Number, default: 1 },
        status: {
          type: String,
          enum: [
            "Order Placed",
            "Partially Completed",
            "Completed",
            "On Hire",
            "Partially Returned",
            "Closed"
          ],
          default: "Order Placed"
        }
      }
    ],
    balance_due: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR", "GBP", "JPY", "CNY"],
      default: "INR",
    },
    etd: {
      type: Date, // Estimated Time of Departure
    },
    eta: {
      type: Date, // Estimated Time of Arrival
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "Order Placed",
        "Partially Completed",
        "Completed",
        "On Hire",
        "Partially Returned",
        "Closed"
      ],
      default: "Order Placed",
    },
    transaction_type: {
      type: String,
      enum: ["Sale", "Hire", "Contract"],
      default: "Sale",
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

export const Order = mongoose.model("Order", OrderSchema);
