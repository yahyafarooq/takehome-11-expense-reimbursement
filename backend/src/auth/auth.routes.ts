import { Router } from "express";
import {
  register,
  login,
  getCurrentUser,
} from "./auth.controller";
import { requireRole } from "../middleware/role.middleware";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);
router.get(
  "/approver-test",
  authenticate,
  requireRole("APPROVER"),
  (_req, res) => {
    res.json({
      message: "Approver access granted",
    });
  }
);

router.get(
  "/approver-test",
  authenticate,
  requireRole("APPROVER"),
  (_req, res) => {
    res.json({
      message: "Approver access granted",
    });
  }
);

export default router;