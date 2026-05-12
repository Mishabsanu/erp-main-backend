import mongoose from "mongoose";

const RegularizationRequestSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, required: true },
        type: { type: String, default: "Attendance Regularization" },
        note: { type: String, required: true },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending"
        },
        comments: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                text: { type: String, required: true },
                timestamp: { type: Date, default: Date.now }
            }
        ],
        requestedOn: { type: Date, default: Date.now },
        lastActionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lastActionOn: { type: Date }
    },
    { timestamps: true }
);

export const RegularizationRequest = mongoose.model("RegularizationRequest", RegularizationRequestSchema);
