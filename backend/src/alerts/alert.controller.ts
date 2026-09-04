import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  getAlerts,
  dismissAlert,
} from "./alert.service";

export async function listAlerts(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const alerts = await getAlerts(req.user.userId);

    return res.status(200).json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch alerts",
    });
  }
}

export async function dismissReportAlert(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const dismissal = await dismissAlert(
      req.params.reportId as string,
      req.user.userId
    );

    return res.status(200).json({
      message: "Alert dismissed successfully",
      dismissal,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to dismiss alert",
    });
  }
}