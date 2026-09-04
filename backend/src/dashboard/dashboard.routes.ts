import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { getDashboardData } from "./dashboard.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  getDashboardData
);

export default router;