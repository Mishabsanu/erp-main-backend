import * as financeService from "../services/finance.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

// --- Expenses ---
export const getExpenses = asyncHandler(async (req, res) => {
  const result = await financeService.getAllExpenses(req.user, req.query);
  return successResponse(res, "Expenses fetched successfully", 200, result);
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await financeService.getExpenseById(req.params.id);
  return successResponse(res, "Expense fetched successfully", 200, expense);
});

export const getNextExpenseId = asyncHandler(async (req, res) => {
  const nextId = await financeService.getLatestExpenseNo();
  return successResponse(res, "Next expense ID fetched", 200, { nextId });
});

export const addExpense = asyncHandler(async (req, res) => {
  const expense = await financeService.createExpense(req.body, req.user, req.files);
  return successResponse(res, "Expense created successfully", 201, expense);
});

export const editExpense = asyncHandler(async (req, res) => {
  const expense = await financeService.updateExpense(req.params.id, req.body, req.files);
  return successResponse(res, "Expense updated successfully", 200, expense);
});

export const approveExpense = asyncHandler(async (req, res) => {
  const expense = await financeService.approveExpense(req.params.id, req.user);
  return successResponse(res, "Expense approved successfully", 200, expense);
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await financeService.deleteExpense(req.params.id);
  return successResponse(res, "Expense deleted successfully", 200);
});

// --- Invoices ---
export const getInvoices = asyncHandler(async (req, res) => {
  const result = await financeService.getAllInvoices(req.user, req.query);
  return successResponse(res, "Invoices fetched successfully", 200, result);
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await financeService.getInvoiceById(req.params.id);
  return successResponse(res, "Invoice fetched successfully", 200, invoice);
});

export const addInvoice = asyncHandler(async (req, res) => {
  const invoice = await financeService.createInvoice(req.body, req.user);
  return successResponse(res, "Invoice created successfully", 201, invoice);
});

export const editInvoice = asyncHandler(async (req, res) => {
  const invoice = await financeService.updateInvoice(req.params.id, req.body);
  return successResponse(res, "Invoice updated successfully", 200, invoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  await financeService.deleteInvoice(req.params.id);
  return successResponse(res, "Invoice deleted successfully", 200);
});

// --- Payments ---
export const getPayments = asyncHandler(async (req, res) => {
  const result = await financeService.getAllPayments(req.user, req.query);
  return successResponse(res, "Payments fetched successfully", 200, result);
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await financeService.getPaymentById(req.params.id);
  return successResponse(res, "Payment fetched successfully", 200, payment);
});

export const getNextPaymentId = asyncHandler(async (req, res) => {
  const nextId = await financeService.getLatestPaymentNo();
  return successResponse(res, "Next payment ID fetched", 200, { nextId });
});

export const addPayment = asyncHandler(async (req, res) => {
  const payment = await financeService.createPayment(req.body, req.user, req.files);
  return successResponse(res, "Payment created successfully", 201, payment);
});

export const editPayment = asyncHandler(async (req, res) => {
  const payment = await financeService.updatePayment(req.params.id, req.body, req.files);
  return successResponse(res, "Payment updated successfully", 200, payment);
});

export const deletePayment = asyncHandler(async (req, res) => {
  await financeService.deletePayment(req.params.id);
  return successResponse(res, "Payment deleted successfully", 200);
});

// --- Ledger ---
export const getLedger = asyncHandler(async (req, res) => {
  const result = await financeService.getLedgerEntries(req.user, req.query);
  return successResponse(res, "Ledger entries fetched successfully", 200, result);
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const result = await financeService.getFinanceDashboardStats(req.user);
  return successResponse(res, "Finance dashboard stats fetched successfully", 200, result);
});
