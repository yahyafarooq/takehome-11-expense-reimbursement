import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getDashboard } from "./dashboard.service";

export async function getDashboardData(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const dashboard = await getDashboard();

    return res.status(200).json(dashboard);
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard",
    });
  }
}