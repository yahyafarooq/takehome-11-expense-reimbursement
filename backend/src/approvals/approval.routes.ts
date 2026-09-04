import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import {
  listSubmittedReports,
  listAssignedSubmittedReports,
  searchExpenseReports,
  assignReportApprover,
  approveExpenseReport,
  rejectExpenseReport,
  markReportPaid,
  bulkUpdateExpenseReports,
  exportApprovedReportsCsv,
} from "./approval.controller";

const router = Router();

// Full submitted queue
router.get(
  "/submitted",
  authenticate,
  requireRole("APPROVER"),
  listSubmittedReports
);

// Assigned submitted queue
router.get(
  "/submitted/assigned",
  authenticate,
  requireRole("APPROVER"),
  listAssignedSubmittedReports
);

// Search, filter, sort and pagination
router.get(
  "/search",
  authenticate,
  requireRole("APPROVER"),
  searchExpenseReports
);

// CSV export of approved reports awaiting payment
router.get(
  "/export/approved",
  authenticate,
  requireRole("APPROVER"),
  exportApprovedReportsCsv
);

// Bulk approve/reject
router.patch(
  "/bulk",
  authenticate,
  requireRole("APPROVER"),
  bulkUpdateExpenseReports
);

// Assign approver
router.post(
  "/:reportId/approvers",
  authenticate,
  requireRole("APPROVER"),
  assignReportApprover
);

// Approve
router.patch(
  "/:reportId/approve",
  authenticate,
  requireRole("APPROVER"),
  approveExpenseReport
);

// Reject
router.patch(
  "/:reportId/reject",
  authenticate,
  requireRole("APPROVER"),
  rejectExpenseReport
);

// Mark as paid
router.patch(
  "/:reportId/pay",
  authenticate,
  requireRole("APPROVER"),
  markReportPaid
);

export default router;