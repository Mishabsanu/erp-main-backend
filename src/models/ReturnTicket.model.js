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
    description: { type: String, default: "" },
    quantity: { type: Number, required: true },
    returnQty: { type: Number, required: true },
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

const ReturnTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true, unique: true },
    parentTicketNo: { type: String, required: true },
    ticketType: { type: String, default: "Return Note" },
    noteCategory: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    returnDate: { type: String, required: true },
    customerName: { type: String, required: true },
    subject: { type: String, required: true },
    projectLocation: { type: String, required: true },
    referenceNo: { type: String },
    reason: { type: String },
    poNo: { type: String },
    invoiceNo: { type: String },
    vehicleNo: { type: String },
    items: { type: [ItemSchema], required: true },
    deliveredBy: { type: DeliveredBySchema, required: true },
    receivedBy: { type: ReceivedBySchema, required: true },
    runningOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    attachments: {
      signedTicket: { type: String, default: "" },
      supportingDocs: { type: [String], default: [] }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const ReturnTicketModel = mongoose.model("ReturnTicket", ReturnTicketSchema);

export default ReturnTicketModel;
