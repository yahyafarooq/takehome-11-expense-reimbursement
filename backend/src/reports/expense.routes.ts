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
  requireRole("EMPLOYEE"),
  addExpenseLine
);

router.patch(
  "/:reportId/expenses/:expenseId",
  authenticate,
  requireRole("EMPLOYEE"),
  editExpenseLine
);

router.delete(
  "/:reportId/expenses/:expenseId",
  authenticate,
  requireRole("EMPLOYEE"),
  removeExpenseLine
);

export default router;