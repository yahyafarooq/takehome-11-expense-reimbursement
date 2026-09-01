import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes";
import reportRoutes from "./reports/report.routes";
import expenseRoutes from "./reports/expense.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reports", expenseRoutes);

export default app;