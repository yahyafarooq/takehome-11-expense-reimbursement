import { Router } from "express";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";
import {
  listReportHistory,
  listReportComments,
  createReportComment,
} from "./history.controller";

const router = Router();

router.get(
  "/:reportId/history",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  listReportHistory
);

router.get(
  "/:reportId/comments",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  listReportComments
);

router.post(
  "/:reportId/comments",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  createReportComment
);

export default router;