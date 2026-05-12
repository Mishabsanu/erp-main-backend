import { Product } from "../models/Product.model.js";
import { User } from "../models/User.model.js";
import { Expense } from "../models/Expense.model.js";
import { Payment } from "../models/Payment.model.js";
import { Quote } from "../models/Quote.model.js";
import { Sale } from "../models/Sale.model.js";
import { DeliveryTicket } from "../models/DeliveryTicket.model.js";
import { SalarySlip } from "../models/SalarySlip.model.js";
import { Attendance } from "../models/Attendance.model.js";
import { Inventory } from "../models/Inventory.model.js";
import { SalaryBreakup } from "../models/SalaryBreakup.model.js";

export const dashboardService = {
  getDashboard: async (user) => {
    const roles = user.role || [];

    // 1. Timeframe Calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    // 2. Aggregate counts & analytics
    const [
      totalProducts,
      totalUsers,
      totalQuotes,
      totalSales,
      totalTickets,
      totalSalaries,
      // Lead Timeframes
      quotesToday,
      quotesWeekly,
      quotesMonthly,
      quotesYearly,
      // Quote Statuses
      quotesPending,
      quotesAccepted,
      // Inventory Summaries
      inventorySummary,
      // HR/Workforce
      attendanceToday,
      salaryBreakupStats
    ] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Quote.countDocuments(),
      Sale.countDocuments(),
      DeliveryTicket.countDocuments(),
      SalarySlip.aggregate([{ $group: { _id: null, total: { $sum: "$netSalary" } } }]),

      // Quotes by timeframe
      Quote.countDocuments({ createdAt: { $gte: today } }),
      Quote.countDocuments({ createdAt: { $gte: weekStart } }),
      Quote.countDocuments({ createdAt: { $gte: monthStart } }),
      Quote.countDocuments({ createdAt: { $gte: yearStart } }),

      // Quotes by status
      Quote.countDocuments({ status: 'Pending' }),
      Quote.countDocuments({ status: 'Accepted' }),

      // Inventory Status
      Inventory.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Attendance
      Attendance.countDocuments({ date: { $gte: today }, status: 'present' }),

      // Salary Breakup Contribution (Averages)
      SalaryBreakup.aggregate([
          {
              $group: {
                  _id: null,
                  avgBasic: { $avg: "$basic" },
                  avgHra: { $avg: "$hra" },
                  avgDeductions: { $avg: { $add: ["$pf", "$esi", "$tds", "$otherDeductions"] } }
              }
          }
      ])
    ]);

    // 3. Finance Trends (Reuse & Expand)
    const [incomeData, expenseData, paymentPaidData] = await Promise.all([
        Payment.aggregate([
            { $match: { type: 'Received' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Expense.aggregate([
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        Payment.aggregate([
            { $match: { type: 'Paid' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
    ]);

    const totalRevenue = incomeData[0]?.total || 0;
    const totalExpenditure = (expenseData[0]?.total || 0) + (paymentPaidData[0]?.total || 0);

    // 4. Monthly Trends (Income vs Expense)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const startMonth = sixMonthsAgo.toISOString().substring(0, 7);

    const [monthlyIncome, monthlyExpenses, monthlyPaidPayments] = await Promise.all([
        Payment.aggregate([
            { $match: { type: 'Received', date: { $gte: startMonth } } },
            { $group: { _id: { $substr: ["$date", 0, 7] }, income: { $sum: "$amount" } } }
        ]),
        Expense.aggregate([
            { $match: { date: { $gte: startMonth } } },
            { $group: { _id: { $substr: ["$date", 0, 7] }, out: { $sum: "$totalAmount" } } }
        ]),
        Payment.aggregate([
            { $match: { type: 'Paid', date: { $gte: startMonth } } },
            { $group: { _id: { $substr: ["$date", 0, 7] }, out: { $sum: "$amount" } } }
        ])
    ]);

    const trendMap = {};
    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().substring(0, 7);
        trendMap[key] = { month: d.toLocaleString('default', { month: 'short' }), income: 0, expenses: 0 };
    }
    monthlyIncome.forEach(d => { if(trendMap[d._id]) trendMap[d._id].income = d.income; });
    [...monthlyExpenses, ...monthlyPaidPayments].forEach(d => {
        if(trendMap[d._id]) trendMap[d._id].expenses += d.out;
    });

    // 5. Categorical Breakdown (Pie Chart)
    const categoryBreakdown = await Expense.aggregate([
        { $group: { _id: "$category", value: { $sum: "$totalAmount" } } },
        { $project: { name: "$_id", value: 1, _id: 0 } },
        { $sort: { value: -1 } },
        { $limit: 6 }
    ]);

    // 6. Recent Activity
    const [recentExpenses, recentPayments, recentQuotes] = await Promise.all([
        Expense.find().sort({ createdAt: -1 }).limit(3).lean(),
        Payment.find().sort({ createdAt: -1 }).limit(3).lean(),
        Quote.find().sort({ createdAt: -1 }).limit(3).lean()
    ]);

    const recentActivity = [
        ...recentExpenses.map(e => ({ type: 'Expense', desc: e.category, amount: e.totalAmount, date: e.date, id: e._id })),
        ...recentPayments.map(p => ({ type: `Payment ${p.type}`, desc: p.remarks || 'Standard Payment', amount: p.amount, date: p.date, id: p._id })),
        ...recentQuotes.map(q => ({ type: 'New Lead', desc: q.clientName, amount: q.totalSellingPrice, date: q.createdAt.toISOString().split('T')[0], id: q._id }))
    ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

    return {
      role: roles[0] || 'staff',
      stats: {
        inventory: {
            totalProducts,
            totalDeliveryTickets: totalTickets,
            statusSummary: inventorySummary.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
        },
        users: { totalStaff: totalUsers },
        finance: {
            totalRevenue,
            totalExpenses: totalExpenditure,
            netProfit: totalRevenue - totalExpenditure,
            monthlyTrends: Object.values(trendMap).reverse(),
            categoryBreakdown
        },
        payroll: {
            totalSalariesProcessed: totalSalaries?.[0]?.total || 0,
            contribution: salaryBreakupStats?.[0] || { avgBasic: 0, avgHra: 0, avgDeductions: 0 }
        },
        sales: {
            totalQuotes,
            totalSalesCount: totalSales,
            recentActivity,
            approvalCount: quotesAccepted,
            pendingCount: quotesPending,
            timeframes: {
                today: quotesToday,
                weekly: quotesWeekly,
                monthly: quotesMonthly,
                yearly: quotesYearly
            }
        },
        hr: {
            attendanceToday
        }
      }
    };
  },
};
