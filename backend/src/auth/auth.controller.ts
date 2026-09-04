import { Request, Response } from "express";
import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator";
import {
  registerUser,
  loginUser,
  getApprovers,
} from "./auth.service";
import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export async function register(
  req: Request,
  res: Response
) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const user = await registerUser(result.data);

    return res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Registration failed";

    return res.status(400).json({
      message,
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const resultData = await loginUser(
      result.data.email,
      result.data.password
    );

    return res.status(200).json(resultData);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Login failed";

    return res.status(401).json({
      message,
    });
  }
}

export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response
) {
  return res.status(200).json({
    user: req.user,
  });
}

export async function listApprovers(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (req.user.role !== "APPROVER") {
      return res.status(403).json({
        message: "Only approvers can view the approver list",
      });
    }

    const approvers = await getApprovers();

    return res.status(200).json({
      approvers,
    });
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch approvers",
    });
  }
}