import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { addExpenseLine } from "./expense.controller";

const router = Router();

router.post(
  "/:reportId/expenses",
  authenticate,
  requireRole("EMPLOYEE"),
  addExpenseLine
);

export default router;