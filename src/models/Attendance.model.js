import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, required: true }, // Normalized to midnight
        signInTime: { type: Date }, // First sign in of the day
        signOutTime: { type: Date }, // Last sign out of the day
        sessions: [
            {
                startTime: { type: Date, required: true },
                endTime: { type: Date },
                duration: { type: Number, default: 0 }, // in milliseconds
            },
        ],
        totalDuration: { type: Number, default: 0 }, // in milliseconds
        status: {
            type: String,
            enum: ["present", "absent", "half-day"],
            default: "present",
        },
        history: [
            {
                action: { type: String, enum: ["signin", "signout"], required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// Compound index to ensure one record per user per day
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", AttendanceSchema);
