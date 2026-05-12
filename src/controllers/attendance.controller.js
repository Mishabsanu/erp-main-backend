import { Attendance } from "../models/Attendance.model.js";
import { User } from "../models/User.model.js";
import { RegularizationRequest } from "../models/RegularizationRequest.model.js";

// Helper to get today's date at midnight
const getTodayDate = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

export const getStatus = async (req, res) => {
    try {
        const today = getTodayDate();

        // Parallel fetch for attendance and user details
        const [attendance, user, firstRecord] = await Promise.all([
            Attendance.findOne({
                user: req.user.id,
                date: today,
            }),
            User.findById(req.user.id).select('createdAt'),
            Attendance.findOne({ user: req.user.id }).sort({ date: 1 }).select('date')
        ]);

        // Use first attendance date if available, otherwise null
        const startDate = firstRecord ? firstRecord.date : null;

        const startData = {
            attendanceStartDate: startDate || null
        };

        if (!attendance) {
            return res.status(200).json({ status: "not_signed_in", data: null, ...startData });
        }

        // Check if currently inside an active session
        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        const isSignedOut = lastSession && lastSession.endTime;

        if (isSignedOut) {
            return res.status(200).json({ status: "signed_out", data: attendance, ...startData });
        }

        return res.status(200).json({ status: "signed_in", data: attendance, ...startData });
    } catch (error) {
        console.error("Get status error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const signIn = async (req, res) => {
    try {
        const today = getTodayDate();
        let attendance = await Attendance.findOne({
            user: req.user.id,
            date: today,
        });

        const now = new Date();

        if (!attendance) {
            // First sign in of the day
            attendance = new Attendance({
                user: req.user.id,
                date: today,
                signInTime: now,
                status: "present",
                sessions: [{ startTime: now }],
                history: [{ action: "signin", timestamp: now }],
            });
        } else {
            // Subsequent sign in
            const lastSession = attendance.sessions[attendance.sessions.length - 1];
            if (lastSession && !lastSession.endTime) {
                return res.status(400).json({ message: "Already signed in" });
            }

            attendance.sessions.push({ startTime: now });
            attendance.history.push({ action: "signin", timestamp: now });
            // Don't overwrite original signInTime
        }

        await attendance.save();
        res.status(201).json({ message: "Signed in successfully", data: attendance });
    } catch (error) {
        console.error("Sign in error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const signOut = async (req, res) => {
    try {
        const today = getTodayDate();
        const attendance = await Attendance.findOne({
            user: req.user.id,
            date: today,
        });

        if (!attendance) {
            return res.status(400).json({ message: "No sign-in record found for today" });
        }

        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        if (!lastSession || lastSession.endTime) {
            return res.status(400).json({ message: "Already signed out" });
        }

        const now = new Date();
        lastSession.endTime = now;
        lastSession.duration = now.getTime() - new Date(lastSession.startTime).getTime();

        // Update total duration
        attendance.totalDuration = attendance.sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);

        attendance.signOutTime = now; // Update last known signOutTime
        attendance.history.push({ action: "signout", timestamp: now });

        await attendance.save();

        res.status(200).json({ message: "Signed out successfully", data: attendance });
    } catch (error) {
        console.error("Sign out error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getHistory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        console.log("getHistory params:", { startDate, endDate, userId: req.user?.id });

        const query = {
            user: req.user.id,
        };

        if (startDate && endDate) {
            let start = new Date(startDate);
            let end = new Date(endDate);

            // Attempt to fix malformed dates (missing dot before ms, e.g. T18:30:00000Z)
            if (isNaN(start.getTime()) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\d{3}Z$/.test(startDate)) {
                start = new Date(startDate.replace(/(\d{3}Z)$/, '.$1'));
            }
            if (isNaN(end.getTime()) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\d{3}Z$/.test(endDate)) {
                end = new Date(endDate.replace(/(\d{3}Z)$/, '.$1'));
            }

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.error("Invalid date params:", { startDate, endDate });
                return res.status(400).json({ message: "Invalid date format provided" });
            }

            query.date = {
                $gte: start,
                $lte: end,
            };
        }

        console.log("getHistory query:", JSON.stringify(query));

        const history = await Attendance.find(query).sort({ date: -1 });
        console.log(`Found ${history.length} records`);

        res.status(200).json({ data: history });
    } catch (error) {
        console.error("Get history error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const requestRegularization = async (req, res) => {
    try {
        const { date, note } = req.body;

        if (!date || !note) {
            return res.status(400).json({ message: "Date and note are required" });
        }

        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        // Check if there's already a pending or approved request for this date
        const existing = await RegularizationRequest.findOne({
            user: req.user.id,
            date: normalizedDate,
            status: { $in: ["Pending", "Approved"] }
        });

        if (existing) {
            return res.status(400).json({ message: "A request for this date is already pending or approved" });
        }

        // AUTO-APPROVE LOGIC (7 per month)
        const startOfMonth = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth(), 1);
        const endOfMonth = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const approvedCount = await RegularizationRequest.countDocuments({
            user: req.user.id,
            status: 'Approved',
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        });

        let initialStatus = 'Pending';
        let autoApproveNote = '';

        if (approvedCount < 7) {
            initialStatus = 'Approved';
            autoApproveNote = ' (Auto-approved by system policy)';
        }

        const request = new RegularizationRequest({
            user: req.user.id,
            date: normalizedDate,
            note: note + autoApproveNote,
            status: initialStatus,
            lastActionBy: initialStatus === 'Approved' ? null : undefined, // System action
            lastActionOn: initialStatus === 'Approved' ? new Date() : undefined
        });

        await request.save();
        res.status(201).json({ message: `Regularization request submitted ${initialStatus === 'Approved' ? '& Auto-Approved' : ''}`, data: request });
    } catch (error) {
        console.error("Regularization request error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getRegularizationRequests = async (req, res) => {
    try {
        const requests = await RegularizationRequest.find({ user: req.user.id })
            .sort({ requestedOn: -1 })
            .populate('lastActionBy', 'name')
            .populate('comments.user', 'name');

        res.status(200).json({ data: requests });
    } catch (error) {
        console.error("Get regularization requests error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


export const addRegularizationComment = async (req, res) => {
    try {
        const { text } = req.body;
        const { id } = req.params;

        if (!text) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const request = await RegularizationRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        request.comments.push({
            user: req.user.id,
            text
        });

        await request.save();

        // Return the updated request with populated users
        const updatedRequest = await RegularizationRequest.findById(id)
            .populate('comments.user', 'name')
            .populate('lastActionBy', 'name');

        res.status(200).json({ message: "Comment added", data: updatedRequest });
    } catch (error) {
        console.error("Add regularization comment error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAdminTodayStatus = async (req, res) => {
    try {
        let queryDate = getTodayDate();
        if (req.query.date) {
            // Parse as local date to ensure "2026-02-04" means Feb 4th 00:00 local time
            // Resolves timezone issues where "2026-02-04" might become "2026-02-03T18:30:00Z"
            const parts = req.query.date.split('-');
            if (parts.length === 3) {
                queryDate = new Date(
                    parseInt(parts[0]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[2])
                );
            } else {
                queryDate = new Date(req.query.date); // Fallback
            }
            queryDate.setHours(0, 0, 0, 0);
        }

        const nextDay = new Date(queryDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // 1. Get all active users
        const users = await User.find({ status: 'active' }).select('name email role mobile');

        // 2. Get all attendance records for the specific date
        // Use range (start to end of day) to catch any records with slight time offsets or UTC shifts
        const startOfDay = new Date(queryDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(queryDate);
        endOfDay.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        // 3. Map status
        const report = users.map(user => {
            const record = attendanceRecords.find(r => r.user.toString() === user._id.toString());

            let status = 'absent';
            let loginTime = null;
            let logoutTime = null;
            let totalDuration = 0;
            let isOnline = false;

            if (record) {
                status = 'present';
                loginTime = record.signInTime;

                const lastSession = record.sessions[record.sessions.length - 1];
                if (lastSession && !lastSession.endTime) {
                    isOnline = true;
                } else {
                    logoutTime = record.signOutTime || (lastSession ? lastSession.endTime : null);
                }

                // Calc provisional duration
                let duration = record.totalDuration || 0;
                // Only add live duration if observing TODAY's report
                const isViewToday = new Date().toDateString() === queryDate.toDateString();
                if (isOnline && isViewToday) {
                    const currentSessionStart = new Date(lastSession.startTime);
                    duration += (new Date().getTime() - currentSessionStart.getTime());
                }
                totalDuration = duration;
            }

            return {
                user,
                status,
                isOnline,
                loginTime,
                logoutTime,
                totalDuration
            };
        });

        // Summary stats
        const stats = {
            total: users.length,
            present: report.filter(r => r.status === 'present').length,
            online: report.filter(r => r.isOnline).length,
            absent: report.filter(r => r.status === 'absent').length
        };

        res.status(200).json({ data: report, stats, date: queryDate });
    } catch (error) {
        console.error("Get admin status error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAdminAttendanceRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "StartDate and EndDate are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Mock Holidays (Synced with Frontend)
        const holidays = [
            '2025-01-01', '2025-01-14', '2025-01-26',
            '2025-03-08', '2025-03-25', '2025-03-30',
            '2025-04-10', '2025-04-14', '2025-04-18',
            '2025-05-01',
            '2025-06-07',
            '2025-07-17',
            '2025-08-15', '2025-08-28', '2025-08-29',
            '2025-09-05', '2025-09-16',
            '2025-10-02', '2025-10-20',
            '2025-11-01', '2025-11-15',
            '2025-12-25'
        ];

        // 1. Get all active users
        const users = await User.find({ status: 'active' }).select('name email role');

        // 2. Get attendance within range
        const attendanceRecords = await Attendance.find({
            date: { $gte: start, $lte: end }
        });

        // 3. Helper to iterate dates
        const getDatesInRange = (startDate, endDate) => {
            const date = new Date(startDate);
            const dates = [];
            while (date <= endDate) {
                dates.push(new Date(date));
                date.setDate(date.getDate() + 1);
            }
            return dates;
        };

        const dateRange = getDatesInRange(start, end);

        // 4. Structure data
        const report = users.map(user => {
            const userRecords = attendanceRecords.filter(r => r.user.toString() === user._id.toString());
            const recordsMap = {};

            dateRange.forEach(d => {
                // Use local date string components to match Frontend "yyyy-MM-dd"
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dayStr = `${y}-${m}-${dd}`;

                // Find record matching this LOCAL date
                const record = userRecords.find(r => {
                    const rd = new Date(r.date);
                    const ry = rd.getFullYear();
                    const rm = String(rd.getMonth() + 1).padStart(2, '0');
                    const rdd = String(rd.getDate()).padStart(2, '0');
                    return `${ry}-${rm}-${rdd}` === dayStr;
                });

                let status = 'A'; // Default Absent
                let details = null;

                const isSunday = d.getDay() === 0;
                const isHoliday = holidays.includes(dayStr);
                const isFuture = d > new Date();

                if (record) {
                    status = 'P'; // Present
                    details = {
                        inTime: record.signInTime,
                        outTime: record.signOutTime,
                        duration: record.totalDuration
                    };
                } else {
                    if (isFuture) {
                        status = 'NA'; // Not Applicable / Future
                    } else if (isHoliday) {
                        status = 'HOL'; // Holiday
                    } else if (isSunday) {
                        status = 'WO'; // Weekly Off
                    }
                }

                recordsMap[dayStr] = {
                    status,
                    ...details
                };
            });

            return {
                user,
                attendance: recordsMap
            };
        });

        res.status(200).json({ data: report, range: dateRange });
    } catch (error) {
        console.error("Get admin range error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
