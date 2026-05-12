
import { Expense } from "../models/Expense.model.js";
import { Invoice } from "../models/Invoice.model.js";
import { Payment } from "../models/Payment.model.js";
import { Ledger } from "../models/Ledger.model.js";
import { Vendor } from "../models/Vendor.model.js";
import { Customer } from "../models/Customer.model.js";

const resolveEntityName = async (id, type) => {
  if (!id) return null;
  try {
    const Model = type === 'Customer' ? Customer : Vendor;
    const entity = await Model.findById(id).lean();
    return entity?.company || null;
  } catch (e) {
    return null;
  }
};



// --- Expenses ---
export const getExpenseById = async (id) => {
  return await Expense.findById(id).populate("createdBy", "name").populate("vendorId", "company")
};

export const getAllExpenses = async (user, { search, companyName,category, status, isApproved, startDate, endDate, page = 1, limit = 10 }) => {
  const query = {};
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: "i" } },
      { referenceNo: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }
  if (companyName) query.companyName = { $regex: companyName, $options: "i" };
  if (category) query.category = category;
  if (status) query.status = status;
  if (isApproved !== undefined) query.isApproved = isApproved === 'true' || isApproved === true;
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const expenses = await Expense.find(query)
    .populate("createdBy", "name")
    .populate("vendorId", "company")
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await Expense.countDocuments(query);
  return {
    content: expenses,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: parseInt(page),
    limit: parseInt(limit)
  };
};

export const getLatestExpenseNo = async () => {
    const latest = await Expense.findOne().sort({ expenseId: -1 }).lean();
    let nextNo = "EXP-00001";
    if (latest?.expenseId) {
        const lastNumber = parseInt(latest.expenseId.replace("EXP-", ""), 10);
        if (!isNaN(lastNumber)) {
            nextNo = `EXP-${String(lastNumber + 1).padStart(5, "0")}`;
        }
    }
    return nextNo;
};

export const createExpense = async (data, user, files) => {
  const expenseId = await getLatestExpenseNo();
  
  const attachments = [];
  if (files) {
    if (files.bill) attachments.push({ name: files.bill[0].originalname, url: `/uploads/${files.bill[0].filename}`, type: 'bill' });
    if (files.receipt) attachments.push({ name: files.receipt[0].originalname, url: `/uploads/${files.receipt[0].filename}`, type: 'receipt' });
    if (files.proof) attachments.push({ name: files.proof[0].originalname, url: `/uploads/${files.proof[0].filename}`, type: 'proof' });
  }

  const expense = await Expense.create({ 
    ...data, 
    expenseId,
    createdBy: user.id, 
    isApproved: false,
    paidTotal: 0,
    balance: data.totalAmount || data.amount || 0,
    attachments,
    accountId: data.accountId,
    handledById: data.handledById,
    contactPerson: data.contactPerson,
    paidBy: data.paidBy
  });
  return expense;
};

export const approveExpense = async (id, user) => {
  const expense = await Expense.findById(id);
  if (!expense) throw new Error("Expense not found");
  if (expense.isApproved) return expense;

  expense.isApproved = true;
  expense.approvedBy = user.id;
  await expense.save();

  const companyName = expense.companyName || await resolveEntityName(expense.vendorId, 'Vendor');

  // Create Ledger entry ONLY on approval
  await Ledger.create({
    date: expense.date,
    description: `${expense.category}: ${expense.description || 'General Expenditure'}`,
    companyName: companyName,
    debit: expense.totalAmount,
    credit: 0,
    balance: expense.totalAmount,
    referenceId: expense._id,
    referenceNo: expense.expenseId,
    referenceType: 'Expense',
    modeOfPayment: expense.modeOfPayment,
    handledBy: expense.paidBy || expense.contactPerson,
    accountId: expense.accountId, // Link ledger to specific account
    createdBy: user.id
  });

  return expense;
};

export const updateExpense = async (id, data, files) => {
  const attachments = [];
  if (files) {
    if (files.bill) attachments.push({ name: files.bill[0].originalname, url: `/uploads/${files.bill[0].filename}`, type: 'bill' });
    if (files.receipt) attachments.push({ name: files.receipt[0].originalname, url: `/uploads/${files.receipt[0].filename}`, type: 'receipt' });
    if (files.proof) attachments.push({ name: files.proof[0].originalname, url: `/uploads/${files.proof[0].filename}`, type: 'proof' });
  }

  // Handle removals first
  if (data.removedAttachments) {
    let urlsToRemove = [];
    try {
      urlsToRemove = typeof data.removedAttachments === 'string' && data.removedAttachments.startsWith('[')
        ? JSON.parse(data.removedAttachments)
        : [data.removedAttachments];
    } catch (e) {
      urlsToRemove = [data.removedAttachments];
    }
    
    await Expense.findByIdAndUpdate(id, {
      $pull: { attachments: { url: { $in: urlsToRemove } } }
    });
  }

  const updatePayload = attachments.length > 0 
    ? { ...data, $push: { attachments: { $each: attachments } } }
    : data;

  const companyName = data.companyName || await resolveEntityName(data.vendorId, 'Vendor');

  const expense = await Expense.findByIdAndUpdate(id, updatePayload, { new: true });
  
  // Sync Ledger ONLY if it was already approved
  if (expense.isApproved) {
    await Ledger.findOneAndUpdate(
      { referenceId: id, referenceType: 'Expense' },
      {
        date: data.date,
        description: `${data.category}: ${data.description || 'General Expenditure Update'}`,
        companyName: companyName,
        debit: data.totalAmount,
        credit: 0,
        balance: data.totalAmount,
        referenceNo: expense.expenseId,
        modeOfPayment: data.modeOfPayment,
        handledBy: data.paidBy || data.contactPerson,
        accountId: data.accountId
      }
    );
  }

  return expense;
};

export const deleteExpense = async (id) => {
  await Expense.findByIdAndDelete(id);
  await Ledger.findOneAndDelete({ referenceId: id, referenceType: 'Expense' });
};

// --- Invoices ---
export const getAllInvoices = async (user, { search, status, startDate, endDate, page = 1, limit = 10 }) => {
  const query = {};
  if (search) {
    query.$or = [
      { invoiceNo: { $regex: search, $options: "i" } },
      { notes: { $regex: search, $options: "i" } }
    ];
  }
  if (status) query.status = status;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const invoices = await Invoice.find(query)
    .populate("customerId", "name company")
    .populate("createdBy", "name")
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await Invoice.countDocuments(query);
  return {
    content: invoices,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: parseInt(page),
    limit: parseInt(limit)
  };
};

export const createInvoice = async (data, user) => {
  const invoice = await Invoice.create({ ...data, createdBy: user.id });
  return invoice;
};

export const getInvoiceById = async (id) => {
  return await Invoice.findById(id).populate("customerId", "name company").populate("createdBy", "name");
};

export const updateInvoice = async (id, data) => {
  const invoice = await Invoice.findByIdAndUpdate(id, data, { new: true });
  return invoice;
};

export const deleteInvoice = async (id) => {
  return await Invoice.findByIdAndDelete(id);
};

// --- Payments ---
export const getAllPayments = async (user, { search, companyName, type, referenceId, referenceType, startDate, endDate, page = 1, limit = 10 }) => {
  const query = {};
  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: "i" } },
      { remarks: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }
  if (companyName) query.companyName = { $regex: companyName, $options: "i" };
  if (type) query.type = type;
  if (referenceId) query.referenceId = referenceId;
  if (referenceType) query.referenceType = referenceType;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const payments = await Payment.find(query)
    .populate("createdBy", "name")
    .populate("recipientDetailId", "company")
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await Payment.countDocuments(query);
  return {
    content: payments,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: parseInt(page),
    limit: parseInt(limit)
  };
};

export const getLatestPaymentNo = async () => {
    const latest = await Payment.findOne().sort({ paymentId: -1 }).lean();
    let nextNo = "PAY-00001";
    if (latest?.paymentId) {
        const lastNumber = parseInt(latest.paymentId.replace("PAY-", ""), 10);
        if (!isNaN(lastNumber)) {
            nextNo = `PAY-${String(lastNumber + 1).padStart(5, "0")}`;
        }
    }
    return nextNo;
};

export const createPayment = async (data, user, files) => {
  const paymentId = await getLatestPaymentNo();
  
  const attachments = [];
  if (files) {
    if (files.bill) attachments.push({ name: files.bill[0].originalname, url: `/uploads/${files.bill[0].filename}`, type: 'bill' });
    if (files.receipt) attachments.push({ name: files.receipt[0].originalname, url: `/uploads/${files.receipt[0].filename}`, type: 'receipt' });
    if (files.proof) attachments.push({ name: files.proof[0].originalname, url: `/uploads/${files.proof[0].filename}`, type: 'proof' });
  }

  // Determine the model for recipientDetailId
  const recipientDetailModel = data.type === 'Received' ? 'Customer' : 'Vendor';
  const amount = Number(data.amount || 0);

  const payment = await Payment.create({ 
    ...data, 
    paymentId, 
    amount,
    createdBy: user.id,
    attachments,
    recipientDetailModel,
    recipientDetailId: data.recipientDetailId && data.recipientDetailId !== '' ? data.recipientDetailId : null,
    referenceId: data.referenceId && data.referenceId !== '' ? data.referenceId : null
  });

  // Update Expense balance if this payment is linked to one
  if (data.referenceType === 'Expense' && data.referenceId) {
    const expense = await Expense.findById(data.referenceId);
    if (expense) {
      expense.paidTotal = (expense.paidTotal || 0) + amount;
      expense.balance = Math.max(0, expense.totalAmount - expense.paidTotal);
      
      if (expense.balance === 0) {
        expense.status = 'paid';
      } else if (expense.paidTotal > 0) {
        expense.status = 'partially_paid';
      }
      await expense.save();
    }
  }

  // Update Invoice balance if this payment is linked to one
  if (data.referenceType === 'Invoice' && data.referenceId) {
    const invoice = await Invoice.findById(data.referenceId);
    if (invoice) {
        invoice.paidAmount = (invoice.paidAmount || 0) + amount;
        invoice.balanceAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);

        if (invoice.balanceAmount === 0) {
            invoice.status = 'Paid';
        } else if (invoice.paidAmount > 0) {
            invoice.status = 'Partially Paid';
        }
        await invoice.save();
    }
  }

  const resCompanyName = data.companyName || await resolveEntityName(data.recipientDetailId, recipientDetailModel);

  // Create Ledger entry for tracking movement in the allocation account
  await Ledger.create({
    date: data.date,
    description: `Payment ${data.type}: ${data.remarks || 'Standard Registry Entry'}`,
    companyName: resCompanyName,
    debit: data.type === 'Paid' ? amount : 0,
    credit: data.type === 'Received' ? amount : 0,
    referenceId: payment._id,
    referenceNo: paymentId,
    balance: amount,
    referenceType: 'Payment',
    modeOfPayment: data.modeOfPayment,
    handledBy: data.paidBy || data.contactPerson,
    accountId: data.accountId && data.accountId !== '' ? data.accountId : null, // Link to specific bank/cash account
    createdBy: user.id
  });

  return payment;
};

export const getPaymentById = async (id) => {
  return await Payment.findById(id).populate("createdBy", "name")
};

export const deletePayment = async (id) => {
  await Payment.findByIdAndDelete(id);
  await Ledger.findOneAndDelete({ referenceId: id, referenceType: 'Payment' });
};

export const updatePayment = async (id, data, files) => {
  const attachments = [];
  if (files) {
    if (files.bill) attachments.push({ name: files.bill[0].originalname, url: `/uploads/${files.bill[0].filename}`, type: 'bill' });
    if (files.receipt) attachments.push({ name: files.receipt[0].originalname, url: `/uploads/${files.receipt[0].filename}`, type: 'receipt' });
    if (files.proof) attachments.push({ name: files.proof[0].originalname, url: `/uploads/${files.proof[0].filename}`, type: 'proof' });
  }

  // Handle removals first
  if (data.removedAttachments) {
    let urlsToRemove = [];
    try {
      urlsToRemove = typeof data.removedAttachments === 'string' && data.removedAttachments.startsWith('[')
        ? JSON.parse(data.removedAttachments)
        : [data.removedAttachments];
    } catch (e) {
      urlsToRemove = [data.removedAttachments];
    }
    
    await Payment.findByIdAndUpdate(id, {
      $pull: { attachments: { url: { $in: urlsToRemove } } }
    });
  }

  const updatePayload = attachments.length > 0 
    ? { ...data, $push: { attachments: { $each: attachments } } }
    : data;

  const payment = await Payment.findByIdAndUpdate(id, updatePayload, { new: true });

  const companyName = data.companyName || await resolveEntityName(data.recipientDetailId, payment.recipientDetailModel);

  // Sync Ledger
  await Ledger.findOneAndUpdate(
    { referenceId: id, referenceType: 'Payment' },
    {
      date: data.date,
      description: `Payment ${data.type} Update: ${data.remarks || 'Standard Registry Entry'}`,
      companyName: companyName,
      debit: data.type === 'Paid' ? data.amount : 0,
      credit: data.type === 'Received' ? data.amount : 0,
      balance: data.amount,
      referenceNo: payment.paymentId,
      modeOfPayment: data.modeOfPayment,
      handledBy: data.paidBy || data.contactPerson,
      accountId: data.accountId
    }
  );

  return payment;
};

// --- Ledger ---
export const getLedgerEntries = async (user, { search, companyName, startDate, endDate, page = 1, limit = 50 }) => {
  const query = {};
  if (companyName) query.companyName = { $regex: companyName, $options: "i" };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: "i" } },
      { referenceType: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }

  const entries = await Ledger.find(query)
    .populate("createdBy", "name")
    .sort({ date: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await Ledger.countDocuments(query);

  // Calculate opening balance if startDate is provided
  let openingBalance = 0;
  if (startDate) {
    const openingStats = await Ledger.aggregate([
      { 
        $match: { 
          date: { $lt: startDate },
          ...(companyName ? { companyName: { $regex: companyName, $options: "i" } } : {})
        } 
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" }
        }
      }
    ]);
    openingBalance = (openingStats[0]?.totalCredit || 0) - (openingStats[0]?.totalDebit || 0);
  }

  // Calculate totals for the entire filtered set (current period)
  const stats = await Ledger.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" }
      }
    }
  ]);

  return {
    content: entries,
    totalCount,
    totalDebit: stats[0]?.totalDebit || 0,
    totalCredit: stats[0]?.totalCredit || 0,
    openingBalance,
    closingBalance: openingBalance + (stats[0]?.totalCredit || 0) - (stats[0]?.totalDebit || 0),
    totalPages: Math.ceil(totalCount / limit),
    currentPage: parseInt(page),
    limit: parseInt(limit)
  };
};

export const getFinanceDashboardStats = async (user) => {
  // 1. Summary Stats
  const globalStats = await Ledger.aggregate([
    {
      $group: {
        _id: null,
        totalIncome: { $sum: "$credit" },
        totalExpenses: { $sum: "$debit" }
      }
    }
  ]);

  // 2. Income by Company (Top 10)
  const incomeByCompany = await Ledger.aggregate([
    { $match: { credit: { $gt: 0 } } },
    {
      $group: {
        _id: "$companyName",
        total: { $sum: "$credit" }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
    {
      $project: {
        name: { $ifNull: ["$_id", "Other / General"] },
        value: "$total",
        _id: 0
      }
    }
  ]);

  // 3. Monthly Trends (Last 6 months)
  const monthlyTrendsStyle = await Ledger.aggregate([
    {
      $group: {
        _id: { $substr: ["$date", 0, 7] }, // Group by YYYY-MM
        income: { $sum: "$credit" },
        expenses: { $sum: "$debit" }
      }
    },
    { $sort: { "_id": 1 } },
    { $limit: 6 },
    {
      $project: {
        month: "$_id",
        income: 1,
        expenses: 1,
        _id: 0
      }
    }
  ]);

  return {
    summary: {
      totalRevenue: globalStats[0]?.totalIncome || 0,
      totalExpenses: globalStats[0]?.totalExpenses || 0,
      netProfit: (globalStats[0]?.totalIncome || 0) - (globalStats[0]?.totalExpenses || 0)
    },
    incomeByCompany,
    monthlyTrends: monthlyTrendsStyle
  };
};
