import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,

  weight: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },

  price: { type: Number, default: 0 }, // Base price in INR
  priceUSD: { type: Number, default: 0 },

  totalWeight: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 }, // Base total cost
  totalCostUSD: { type: Number, default: 0 },

  // Shipping
  shippingAmount: { type: Number, default: 0 }, // Total shipping amount for item
  shippingPercentage: { type: Number, default: 0 }, // Item-level %
  manualShipping: { type: Boolean, default: false }, // Was shipping % manually edited?

  // NEW: Unit shipping calculations
  unitShippingAmount: { type: Number, default: 0 }, // base * ship%
  unitPriceWithShipping: { type: Number, default: 0 }, // base + shipping amount

  // Margin
  marginPercentage: { type: Number, default: 0 },
  marginAmount: { type: Number, default: 0 }, // per unit margin

  // Final price
  sellingPrice: { type: Number, default: 0 }, // final per unit selling price
  totalSellingPrice: { type: Number, default: 0 }, // sellingPrice * qty

  // NEW: Gross margin
  grossMargin: { type: Number, default: 0 }, // (base * margin%) * qty

  // Deep price used in UI
  deepPrice: { type: Number, default: 0 },
});

const quoteTrackSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true },
    companyName: { type: String },
    quoteNo: { type: String },

    // Currency (INR / USD)
    currency: { type: String, enum: ["INR", "USD"], default: "INR" },

    // Current exchange rate
    exchangeRate: { type: Number, default: 83 },

    items: [lineItemSchema],

    // Shipping input fields
    totalContainers: { type: Number, default: 0 },
    costPerContainer: { type: Number, default: 0 },

    // Auto-calculated totals
    totalShippingCost: { type: Number, default: 0 },
    totalItemCost: { type: Number, default: 0 }, // Total base cost
    totalWeight: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },

    // NEW totals
    shippingPercentage: { type: Number, default: 0 }, // global auto shipping %
    totalGrossMargin: { type: Number, default: 0 }, // sum of all item gross margins
    totalSellingPrice: { type: Number, default: 0 }, // sum of all totalSellingPrice

    // Quote Status
    status: {
      type: String,
      enum: ["Pending", "Quoted", "Accepted", "Rejected"],
      default: "Pending",
    },
    attachments: [{ type: String }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Quote = mongoose.model("QuoteTrack", quoteTrackSchema);
