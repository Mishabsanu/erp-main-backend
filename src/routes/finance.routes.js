import express from "express";
import * as financeController from "../controllers/finance.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply JWT verification to all finance routes
router.use(authMiddleware);


import upload from "../middleware/upload.js";

// --- Expenses ---
router.get("/expenses", financeController.getExpenses);
router.get("/expenses/next-id", financeController.getNextExpenseId);
router.get("/expenses/:id", financeController.getExpenseById);
router.post("/expenses", upload.fields([
  { name: 'bill', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]), financeController.addExpense);
router.put("/expenses/:id", upload.fields([
  { name: 'bill', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]), financeController.editExpense);
router.patch("/expenses/:id/approve", financeController.approveExpense);
router.delete("/expenses/:id", financeController.deleteExpense);

// --- Invoices ---
router.get("/invoices", financeController.getInvoices);
router.get("/invoices/:id", financeController.getInvoiceById);
router.post("/invoices", financeController.addInvoice);
router.put("/invoices/:id", financeController.editInvoice);
router.delete("/invoices/:id", financeController.deleteInvoice);

// --- Payments ---
router.get("/payments", financeController.getPayments);
router.get("/payments/next-id", financeController.getNextPaymentId);
router.get("/payments/:id", financeController.getPaymentById);
router.post("/payments", upload.fields([
  { name: 'bill', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]), financeController.addPayment);
router.put("/payments/:id", upload.fields([
  { name: 'bill', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]), financeController.editPayment);
router.delete("/payments/:id", financeController.deletePayment);

// --- Ledger ---
router.get("/ledger", financeController.getLedger);

// --- Dashboard ---
router.get("/dashboard", financeController.getDashboardStats);

export default router;
