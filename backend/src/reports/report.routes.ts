import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createExpenseReport,
  getMyReports,
  submitExpenseReport,
  updateExpenseReport,
  archiveExpenseReport,
  restoreExpenseReport,
} from "./report.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("EMPLOYEE"),
  createExpenseReport
);

router.get(
  "/my",
  authenticate,
  requireRole("EMPLOYEE"),
  getMyReports
);

router.post(
  "/:reportId/submit",
  authenticate,
  requireRole("EMPLOYEE"),
  submitExpenseReport
);

router.patch(
  "/:reportId",
  authenticate,
  requireRole("EMPLOYEE"),
  updateExpenseReport
);

router.patch(
  "/:reportId/archive",
  authenticate,
  requireRole("EMPLOYEE"),
  archiveExpenseReport
);

router.patch(
  "/:reportId/restore",
  authenticate,
  requireRole("EMPLOYEE"),
  restoreExpenseReport
);

export default router;