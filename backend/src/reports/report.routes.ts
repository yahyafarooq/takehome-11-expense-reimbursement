import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createExpenseReport,
  getMyReports,
  submitExpenseReport,
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

export default router;