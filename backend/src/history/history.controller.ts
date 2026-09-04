import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  getReportHistory,
  getReportComments,
  addReportComment,
} from "./history.service";

export async function listReportHistory(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const history = await getReportHistory(
      req.params.reportId as string,
      req.user
    );

    return res.status(200).json({ history });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch report history";

    if (message === "Expense report not found") {
      return res.status(404).json({ message });
    }
    if (message.includes("permission")) {
      return res.status(403).json({ message });
    }

    return res.status(400).json({ message });
  }
}

export async function listReportComments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const comments = await getReportComments(
      req.params.reportId as string,
      req.user
    );

    return res.status(200).json({ comments });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch report comments";

    if (message === "Expense report not found") {
      return res.status(404).json({ message });
    }
    if (message.includes("permission")) {
      return res.status(403).json({ message });
    }

    return res.status(400).json({ message });
  }
}

export async function createReportComment(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { comment } = req.body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const result = await addReportComment(
      req.params.reportId as string,
      req.user.userId,
      comment
    );

    return res.status(201).json({
      message: "Comment added successfully",
      comment: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to add comment";

    if (message === "Expense report not found") {
      return res.status(404).json({ message });
    }
    if (message.includes("permission")) {
      return res.status(403).json({ message });
    }

    return res.status(400).json({ message });
  }
}