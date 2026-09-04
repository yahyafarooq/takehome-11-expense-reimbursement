import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: "EMPLOYEE" | "APPROVER";
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(token as string, secret) as {
      userId: string;
      role: "EMPLOYEE" | "APPROVER";
    };

    if (
      typeof decoded !== "object" ||
      !decoded ||
      !("userId" in decoded) ||
      !("role" in decoded)
    ) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    req.user = {
      userId: String(decoded.userId),
      role: decoded.role as "EMPLOYEE" | "APPROVER",
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

export function requireRole(...allowedRoles: ("EMPLOYEE" | "APPROVER")[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
}