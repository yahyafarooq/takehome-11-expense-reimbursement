import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import {
  listSubmittedReports,
  assignReportApprover,
  approveExpenseReport,
  rejectExpenseReport,
  markReportPaid,
} from "./approval.controller";

const router = Router();

router.get(
  "/submitted",
  authenticate,
  requireRole("APPROVER"),
  listSubmittedReports
);

router.post(
  "/:reportId/approvers",
  authenticate,
  requireRole("APPROVER"),
  assignReportApprover
);

router.patch(
  "/:reportId/approve",
  authenticate,
  requireRole("APPROVER"),
  approveExpenseReport
);

router.patch(
  "/:reportId/reject",
  authenticate,
  requireRole("APPROVER"),
  rejectExpenseReport
);

router.patch(
  "/:reportId/pay",
  authenticate,
  requireRole("APPROVER"),
  markReportPaid
);

export default router;