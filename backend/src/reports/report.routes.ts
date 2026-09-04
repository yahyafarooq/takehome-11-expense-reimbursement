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
  requireRole("EMPLOYEE", "APPROVER"),
  createExpenseReport
);

router.get(
  "/my",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  getMyReports
);

router.post(
  "/:reportId/submit",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  submitExpenseReport
);

router.patch(
  "/:reportId",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  updateExpenseReport
);

router.patch(
  "/:reportId/archive",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  archiveExpenseReport
);

router.patch(
  "/:reportId/restore",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  restoreExpenseReport
);

export default router;