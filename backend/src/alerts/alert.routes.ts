import { Router } from "express";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";
import {
  listAlerts,
  dismissReportAlert,
} from "./alert.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("APPROVER"),
  listAlerts
);

router.patch(
  "/:reportId/dismiss",
  authenticate,
  requireRole("APPROVER"),
  dismissReportAlert
);

export default router;