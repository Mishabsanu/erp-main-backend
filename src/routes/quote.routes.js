import express from "express";
import * as quoteController from "../controllers/quote.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  createQuoteValidator,
  updateQuoteValidator,
} from "../validators/quote.validator.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadDisk } from "../config/upload.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  allowRoles("quote_track:view"),
  quoteController.list
);
router.get(
  "/:id",
  authMiddleware,
  allowRoles("quote_track:view"),
  quoteController.getOne
);
router.post(
  "/",
  authMiddleware,
  allowRoles("quote_track:create"),
  uploadDisk.array("attachments", 10),
  validate,
  quoteController.create
);
router.put(
  "/:id",
  authMiddleware,
  allowRoles("quote_track:update"),
  uploadDisk.array("attachments", 10), 
  updateQuoteValidator,
  validate,
  quoteController.update
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("quote_track:delete"),
  quoteController.remove
);

router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("quote_track:update"),
  quoteController.updateQuoteTrackStatus
);

router.post(
  "/import/google-sheet",
  authMiddleware,
  allowRoles("quote_track:create"),
  quoteController.importFromGoogleSheet
);

router.post(
  "/import/csv",
  authMiddleware,
  allowRoles("quote_track:create"),
  uploadDisk.single("file"),
  quoteController.importFromCsvFile
);

export default router;
