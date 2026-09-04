import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";

import { requireRole } from "../middleware/role.middleware";

import {
  addExpenseLine,
  editExpenseLine,
  removeExpenseLine,
} from "./expense.controller";

const router = Router();

router.post(
  "/:reportId/expenses",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  addExpenseLine
);

router.patch(
  "/:reportId/expenses/:expenseId",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  editExpenseLine
);

router.delete(
  "/:reportId/expenses/:expenseId",
  authenticate,
  requireRole("EMPLOYEE", "APPROVER"),
  removeExpenseLine
);

export default router;