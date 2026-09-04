import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes";
import reportRoutes from "./reports/report.routes";
import expenseRoutes from "./reports/expense.routes";
import approvalRoutes from "./approvals/approval.routes";
import dashboardRoutes from "./dashboard/dashboard.routes";
import historyRoutes from "./history/history.routes";
import alertRoutes from "./alerts/alert.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reports", expenseRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", historyRoutes);
app.use("/api/alerts", alertRoutes);

export default app;