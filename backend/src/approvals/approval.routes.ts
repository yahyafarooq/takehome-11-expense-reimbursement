import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listSubmittedReports,
  assignReportApprover,
  approveExpenseReport,
  rejectExpenseReport,
} from "./approval.controller";

const router = Router();

router.get(
  "/submitted",
  authenticate,
  requireRole("APPROVER"),
  listSubmittedReports
);

router.post(
  "/:reportId/assign",
  authenticate,
  requireRole("APPROVER"),
  assignReportApprover
);

router.post(
  "/:reportId/approve",
  authenticate,
  requireRole("APPROVER"),
  approveExpenseReport
);

router.post(
  "/:reportId/reject",
  authenticate,
  requireRole("APPROVER"),
  rejectExpenseReport
);

export default router;