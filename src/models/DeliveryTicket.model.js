import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    itemCode: { type: String, required: true },
    unit: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true },
    requiredQty: { type: Number, required: true },
  },
  { _id: false }
);

const ReceivedBySchema = new mongoose.Schema(
  {
    receivedByName: { type: String, required: true },
    receivedByMobile: { type: String, required: true },
    qatarId: { type: String, required: true },
    receivedDate: { type: Date, required: true },
  },
  { _id: false }
);

const DeliveredBySchema = new mongoose.Schema(
  {
    deliveredByName: { type: String, required: true },
    deliveredByMobile: { type: String, required: true },
    deliveredDate: { type: Date, required: true },
  },
  { _id: false }
);

const DeliveryTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true, unique: true },
    ticketType: { type: String, default: "Delivery Note" },
    noteCategory: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true },
    deliveryDate: { type: String, required: true },

    subject: { type: String, required: true },
    projectLocation: { type: String, required: true },

    referenceNo: { type: String },
    poNo: { type: String },
    invoiceNo: { type: String },
    vehicleNo: { type: String },
    driverName: { type: String },

    items: { type: [ItemSchema], required: true },

    deliveredBy: { type: DeliveredBySchema, required: true },
    receivedBy: { type: ReceivedBySchema, required: true },
    runningOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: {
      signedTicket: { type: String },
      supportingDocs: [{ type: String }]
    }
  },
  { timestamps: true }
);


export const DeliveryTicket = mongoose.model("DeliveryTicket", DeliveryTicketSchema);
