import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type Role = "EMPLOYEE" | "APPROVER";

type ExpenseCategory =
  | "TRAVEL"
  | "MEALS"
  | "HOTEL"
  | "SUPPLIES"
  | "OTHER";

interface ExpenseLine {
  id: string;
  expenseDate: string;
  amount: number | string;
  category: ExpenseCategory;
  description: string;
}

interface Report {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  status: string;
  total: number | string;
  archived?: boolean;
  submittedAt?: string | null;
  createdAt?: string;
  expenseLines?: ExpenseLine[];
  owner?: {
    id?: string;
    name: string;
    email: string;
  };
  approvers?: {
    id: string;
    approverId: string;
    assignedAt?: string;
    approver: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

interface Approver {
  id: string;
  name: string;
  email: string;
}

interface Dashboard {
  summary: {
    awaitingApproval: number;
    reimbursementsDue: number;
    approvedThisWeek: number;
    paidThisWeek: number;
  };
  statusBreakdown: {
    status: string;
    count: number;
    total: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
    total: number;
  }[];
  paidPerWeek: {
    weekStart: string;
    total: number;
  }[];
}

interface Alert {
  reportId: string;
  title: string;
  staleDays: number;
  owner: {
    name: string;
    email: string;
  };
}

const CATEGORIES: ExpenseCategory[] = [
  "TRAVEL",
  "MEALS",
  "HOTEL",
  "SUPPLIES",
  "OTHER",
];

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function inputDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [role, setRole] = useState<Role>(
    (localStorage.getItem("role") as Role) || "EMPLOYEE"
  );

  const [email, setEmail] = useState("approver@example.com");
  const [password, setPassword] = useState("Password123");

  const [reports, setReports] = useState<Report[]>([]);
  const [archivedReports, setArchivedReports] = useState<Report[]>(
    []
  );

  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  /* Goal 5 - Approver queues and assignments */
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [queue, setQueue] = useState<"ALL" | "ASSIGNED">("ALL");
  const [selectedApprover, setSelectedApprover] = useState<
    Record<string, string>
  >({});

  /* Create report */
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  /* Report editing */
  const [editingReportId, setEditingReportId] =
    useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  /* Expense form */
  const [expenseReportId, setExpenseReportId] =
    useState<string | null>(null);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [category, setCategory] =
    useState<ExpenseCategory>("TRAVEL");
  const [description, setDescription] = useState("");

  /* Expense editing */
  const [editingExpenseId, setEditingExpenseId] =
    useState<string | null>(null);
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseCategory, setEditExpenseCategory] =
    useState<ExpenseCategory>("TRAVEL");
  const [editExpenseDescription, setEditExpenseDescription] =
    useState("");

  const [message, setMessage] = useState("");

  const api = axios.create({
    baseURL: API,
  });

  api.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  async function login() {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const newToken = response.data.token;
      const newRole = response.data.user.role as Role;

      localStorage.setItem("token", newToken);
      localStorage.setItem("role", newRole);

      setToken(newToken);
      setRole(newRole);

      setMessage("Login successful");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Login failed"
      );
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setToken("");
    setDashboard(null);
    setReports([]);
    setArchivedReports([]);
    setAlerts([]);
    setMessage("");
  }

  async function loadReports() {
    try {
      if (role === "APPROVER") {
        const endpoint =
          queue === "ASSIGNED"
            ? "/approvals/submitted/assigned"
            : "/approvals/submitted";

        const response = await api.get(endpoint);

        setReports(response.data.reports || []);
        setArchivedReports([]);
      } else {
        const response = await api.get("/reports/my");

        setReports(response.data.reports || []);
        setArchivedReports(
          response.data.archivedReports || []
        );
      }
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load reports"
      );
    }
  }

  async function loadApprovers() {
    if (role !== "APPROVER") return;

    try {
      const response = await api.get("/auth/approvers");
      setApprovers(response.data.approvers || []);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load approvers"
      );
    }
  }

  async function loadDashboard() {
    if (role !== "APPROVER") return;

    try {
      const response = await api.get("/dashboard");

      setDashboard(response.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load dashboard"
      );
    }
  }

  async function loadAlerts() {
    if (role !== "APPROVER") return;

    try {
      const response = await api.get("/alerts");

      setAlerts(response.data.alerts || []);
    } catch {
      setAlerts([]);
    }
  }

  async function createReport() {
    if (!title.trim()) {
      setMessage("Please enter a report title");
      return;
    }

    if (!startDate || !endDate) {
      setMessage("Please select the report date range");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setMessage("End date cannot be before start date");
      return;
    }

    try {
      const response = await api.post("/reports", {
        title: title.trim(),
        startDate: new Date(
          `${startDate}T00:00:00`
        ).toISOString(),
        endDate: new Date(
          `${endDate}T23:59:59`
        ).toISOString(),
      });

      setMessage(
        `Report created: ${response.data.report.title}`
      );

      setTitle("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to create report"
      );
    }
  }

  function startEditingReport(report: Report) {
    setEditingReportId(report.id);
    setEditTitle(report.title);
    setEditStartDate(inputDate(report.startDate));
    setEditEndDate(inputDate(report.endDate));

    setMessage("");
  }

  function cancelEditingReport() {
    setEditingReportId(null);
    setEditTitle("");
    setEditStartDate("");
    setEditEndDate("");
  }

  async function updateReport(reportId: string) {
    if (!editTitle.trim()) {
      setMessage("Report title is required");
      return;
    }

    if (!editStartDate || !editEndDate) {
      setMessage("Start and end dates are required");
      return;
    }

    if (
      new Date(editEndDate) <
      new Date(editStartDate)
    ) {
      setMessage("End date cannot be before start date");
      return;
    }

    try {
      await api.patch(`/reports/${reportId}`, {
        title: editTitle.trim(),
        startDate: new Date(
          `${editStartDate}T00:00:00`
        ).toISOString(),
        endDate: new Date(
          `${editEndDate}T23:59:59`
        ).toISOString(),
      });

      cancelEditingReport();

      setMessage("Report updated successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to update report"
      );
    }
  }

  async function archiveReport(reportId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to archive this report?"
    );

    if (!confirmed) return;

    try {
      await api.patch(
        `/reports/${reportId}/archive`
      );

      setMessage("Report archived successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to archive report"
      );
    }
  }

  async function restoreReport(reportId: string) {
    try {
      await api.patch(
        `/reports/${reportId}/restore`
      );

      setMessage("Report restored successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to restore report"
      );
    }
  }

  function startAddingExpense(reportId: string) {
    setExpenseReportId(reportId);
    setExpenseDate(
      new Date().toISOString().slice(0, 10)
    );
    setAmount("");
    setCategory("TRAVEL");
    setDescription("");
  }

  function cancelAddingExpense() {
    setExpenseReportId(null);
    setExpenseDate(
      new Date().toISOString().slice(0, 10)
    );
    setAmount("");
    setCategory("TRAVEL");
    setDescription("");
  }

  async function addExpense(reportId: string) {
    const numericAmount = Number(amount);

    if (!expenseDate) {
      setMessage("Please select an expense date");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Please enter a valid expense amount");
      return;
    }

    if (!description.trim()) {
      setMessage("Please enter an expense description");
      return;
    }

    try {
      await api.post(`/reports/${reportId}/expenses`, {
        expenseDate: new Date(
          `${expenseDate}T00:00:00`
        ).toISOString(),
        amount: numericAmount,
        category,
        description: description.trim(),
      });

      cancelAddingExpense();

      setMessage("Expense added successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to add expense"
      );
    }
  }

  function startEditingExpense(expense: ExpenseLine) {
    setEditingExpenseId(expense.id);
    setEditExpenseDate(
      inputDate(expense.expenseDate)
    );
    setEditExpenseAmount(String(expense.amount));
    setEditExpenseCategory(expense.category);
    setEditExpenseDescription(expense.description);
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null);
    setEditExpenseDate("");
    setEditExpenseAmount("");
    setEditExpenseCategory("TRAVEL");
    setEditExpenseDescription("");
  }

  async function updateExpense(
    reportId: string,
    expenseId: string
  ) {
    const numericAmount = Number(editExpenseAmount);

    if (!editExpenseDate) {
      setMessage("Please select an expense date");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Please enter a valid expense amount");
      return;
    }

    if (!editExpenseDescription.trim()) {
      setMessage("Please enter an expense description");
      return;
    }

    try {
      await api.patch(
        `/reports/${reportId}/expenses/${expenseId}`,
        {
          expenseDate: new Date(
            `${editExpenseDate}T00:00:00`
          ).toISOString(),
          amount: numericAmount,
          category: editExpenseCategory,
          description:
            editExpenseDescription.trim(),
        }
      );

      cancelEditingExpense();

      setMessage("Expense updated successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to update expense"
      );
    }
  }

  async function deleteExpense(
    reportId: string,
    expenseId: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/reports/${reportId}/expenses/${expenseId}`
      );

      setMessage("Expense deleted successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to delete expense"
      );
    }
  }

  async function submitReport(reportId: string) {
    try {
      await api.post(
        `/reports/${reportId}/submit`
      );

      setMessage("Report submitted successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to submit report"
      );
    }
  }

  async function assignApproverToReport(reportId: string) {
    const approverId = selectedApprover[reportId];

    if (!approverId) {
      setMessage("Please select an approver");
      return;
    }

    try {
      await api.post(`/approvals/${reportId}/approvers`, {
        approverId,
      });

      setSelectedApprover((current) => ({
        ...current,
        [reportId]: "",
      }));

      setMessage("Approver assigned successfully");
      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to assign approver"
      );
    }
  }

  async function approveReport(reportId: string) {
    try {
      await api.patch(
        `/approvals/${reportId}/approve`
      );

      setMessage("Report approved");

      await loadReports();
      await loadDashboard();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to approve report"
      );
    }
  }

  async function rejectReport(reportId: string) {
    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await api.patch(
        `/approvals/${reportId}/reject`,
        {
          reason: reason.trim(),
        }
      );

      setMessage("Report rejected");

      await loadReports();
      await loadDashboard();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to reject report"
      );
    }
  }

  async function payReport(reportId: string) {
    try {
      await api.patch(
        `/approvals/${reportId}/pay`
      );

      setMessage("Report marked as paid");

      await loadReports();
      await loadDashboard();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to mark report as paid"
      );
    }
  }

  async function dismissAlert(reportId: string) {
    try {
      await api.patch(
        `/alerts/${reportId}/dismiss`
      );

      await loadAlerts();

      setMessage("Alert dismissed");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to dismiss alert"
      );
    }
  }

  useEffect(() => {
    if (!token) return;

    loadReports();

    if (role === "APPROVER") {
      loadApprovers();
      loadDashboard();
      loadAlerts();
    }
  }, [token, role, queue]);

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Expense Reimbursement</h1>

          <p>Sign in to continue</p>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button onClick={login}>
            Sign In
          </button>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <small>
            Demo approver:
            <br />
            approver@example.com
            <br />
            Password: Password123
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>Expense Reimbursement</h1>

          <span className="role">
            {role}
          </span>
        </div>

        <button onClick={logout}>
          Logout
        </button>
      </header>

      {message && (
        <div className="message-bar">
          {message}
        </div>
      )}

      {/* ================= APPROVER DASHBOARD ================= */}

      {role === "APPROVER" && dashboard && (
        <>
          <section className="stats">
            <div className="stat-card">
              <span>Awaiting Approval</span>
              <strong>
                {dashboard.summary.awaitingApproval}
              </strong>
            </div>

            <div className="stat-card">
              <span>Reimbursements Due</span>
              <strong>
                ₹{dashboard.summary.reimbursementsDue}
              </strong>
            </div>

            <div className="stat-card">
              <span>Approved This Week</span>
              <strong>
                ₹{dashboard.summary.approvedThisWeek}
              </strong>
            </div>

            <div className="stat-card">
              <span>Paid This Week</span>
              <strong>
                ₹{dashboard.summary.paidThisWeek}
              </strong>
            </div>
          </section>

          {/* STALE ALERTS */}

          <section className="panel">
            <div className="panel-header">
              <h2>
                Stale Alerts ({alerts.length})
              </h2>

              <button onClick={loadAlerts}>
                Refresh
              </button>
            </div>

            {alerts.length === 0 ? (
              <p>No stale alerts.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  className="alert"
                  key={alert.reportId}
                >
                  <div>
                    <strong>
                      {alert.title}
                    </strong>

                    <p>
                      {alert.owner.name} ·{" "}
                      {alert.staleDays} days old
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      dismissAlert(
                        alert.reportId
                      )
                    }
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* ================= EMPLOYEE CREATE REPORT ================= */}

      {role === "EMPLOYEE" && (
        <section className="panel">
          <h2>Create Expense Report</h2>

          <div className="form-row">
            <input
              placeholder="Report title"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />

            <div>
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
              />
            </div>

            <div>
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
              />
            </div>

            <button onClick={createReport}>
              Create Draft
            </button>
          </div>
        </section>
      )}

      {/* ================= REPORT LIST ================= */}

      <section className="panel">
        <div className="panel-header">
          <h2>
            {role === "APPROVER"
              ? "Submitted Expense Reports"
              : "My Expense Reports"}
          </h2>

          <button onClick={loadReports}>
            Refresh
          </button>
        </div>

        {role === "APPROVER" && (
          <div className="actions">
            <button
              onClick={() => setQueue("ALL")}
              disabled={queue === "ALL"}
            >
              All Submitted
            </button>
            <button
              onClick={() => setQueue("ASSIGNED")}
              disabled={queue === "ASSIGNED"}
            >
              My Assigned
            </button>
          </div>
        )}

        {role === "APPROVER" && (
          <p>
            {queue === "ALL"
              ? "Showing every submitted report."
              : "Showing submitted reports assigned to you."}
          </p>
        )}

        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          <div className="reports">
            {reports.map((report) => (
              <div
                className="report-card"
                key={report.id}
              >
                {/* ================= REPORT HEADER ================= */}

                {editingReportId === report.id ? (
                  <div className="edit-form">
                    <h3>Edit Report</h3>

                    <input
                      value={editTitle}
                      onChange={(e) =>
                        setEditTitle(
                          e.target.value
                        )
                      }
                      placeholder="Report title"
                    />

                    <div className="form-row">
                      <div>
                        <label>
                          Start Date
                        </label>

                        <input
                          type="date"
                          value={editStartDate}
                          onChange={(e) =>
                            setEditStartDate(
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label>
                          End Date
                        </label>

                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) =>
                            setEditEndDate(
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        onClick={() =>
                          updateReport(
                            report.id
                          )
                        }
                      >
                        Save Changes
                      </button>

                      <button
                        onClick={
                          cancelEditingReport
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3>{report.title}</h3>

                    {report.owner && (
                      <p>
                        Owner:{" "}
                        {report.owner.name} (
                        {report.owner.email})
                      </p>
                    )}

                    <p>
                      Period:{" "}
                      {formatDate(
                        report.startDate
                      )}{" "}
                      —{" "}
                      {formatDate(
                        report.endDate
                      )}
                    </p>

                    <p>
                      Status:{" "}
                      <strong>
                        {report.status}
                      </strong>
                    </p>

                    <p>
                      Total: ₹{report.total}
                    </p>

                    {report.submittedAt && (
                      <p>
                        Submitted:{" "}
                        {formatDate(
                          report.submittedAt
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* ================= EMPLOYEE DRAFT ================= */}

                {role === "EMPLOYEE" &&
                  report.status === "DRAFT" &&
                  editingReportId !== report.id && (
                    <>
                      <div className="actions">
                        <button
                          onClick={() =>
                            startEditingReport(
                              report
                            )
                          }
                        >
                          Edit Report
                        </button>

                        <button
                          onClick={() =>
                            archiveReport(
                              report.id
                            )
                          }
                        >
                          Archive
                        </button>

                        <button
                          onClick={() =>
                            startAddingExpense(
                              report.id
                            )
                          }
                        >
                          Add Expense
                        </button>

                        <button
                          onClick={() =>
                            submitReport(
                              report.id
                            )
                          }
                        >
                          Submit Report
                        </button>
                      </div>
                    </>
                  )}

                {/* ================= ADD EXPENSE FORM ================= */}

                {role === "EMPLOYEE" &&
                  report.status === "DRAFT" &&
                  expenseReportId === report.id && (
                    <div className="expense-form">
                      <h4>
                        Add Expense
                      </h4>

                      <div className="form-row">
                        <div>
                          <label>
                            Expense Date
                          </label>

                          <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) =>
                              setExpenseDate(
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <label>
                            Amount
                          </label>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) =>
                              setAmount(
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <label>
                            Category
                          </label>

                          <select
                            value={category}
                            onChange={(e) =>
                              setCategory(
                                e.target
                                  .value as ExpenseCategory
                              )
                            }
                          >
                            {CATEGORIES.map(
                              (item) => (
                                <option
                                  key={item}
                                  value={item}
                                >
                                  {item}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label>
                            Description
                          </label>

                          <input
                            placeholder="Description"
                            value={description}
                            onChange={(e) =>
                              setDescription(
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="actions">
                        <button
                          onClick={() =>
                            addExpense(
                              report.id
                            )
                          }
                        >
                          Save Expense
                        </button>

                        <button
                          onClick={
                            cancelAddingExpense
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                {/* ================= EXPENSE LINES ================= */}

                {report.expenseLines &&
                  report.expenseLines.length > 0 && (
                    <div className="expenses">
                      <h4>
                        Expense Lines
                      </h4>

                      {report.expenseLines.map(
                        (expense) => (
                          <div
                            className="expense-item"
                            key={expense.id}
                          >
                            {editingExpenseId ===
                            expense.id ? (
                              <div className="expense-edit">
                                <div className="form-row">
                                  <div>
                                    <label>
                                      Date
                                    </label>

                                    <input
                                      type="date"
                                      value={
                                        editExpenseDate
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setEditExpenseDate(
                                          e.target
                                            .value
                                        )
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label>
                                      Amount
                                    </label>

                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={
                                        editExpenseAmount
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setEditExpenseAmount(
                                          e.target
                                            .value
                                        )
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label>
                                      Category
                                    </label>

                                    <select
                                      value={
                                        editExpenseCategory
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setEditExpenseCategory(
                                          e.target
                                            .value as ExpenseCategory
                                        )
                                      }
                                    >
                                      {CATEGORIES.map(
                                        (
                                          item
                                        ) => (
                                          <option
                                            key={
                                              item
                                            }
                                            value={
                                              item
                                            }
                                          >
                                            {item}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>

                                  <div>
                                    <label>
                                      Description
                                    </label>

                                    <input
                                      value={
                                        editExpenseDescription
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setEditExpenseDescription(
                                          e.target
                                            .value
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="actions">
                                  <button
                                    onClick={() =>
                                      updateExpense(
                                        report.id,
                                        expense.id
                                      )
                                    }
                                  >
                                    Save
                                  </button>

                                  <button
                                    onClick={
                                      cancelEditingExpense
                                    }
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <strong>
                                    ₹
                                    {
                                      expense.amount
                                    }
                                  </strong>

                                  <span>
                                    {" "}
                                    ·{" "}
                                    {
                                      expense.category
                                    }
                                  </span>

                                  <p>
                                    {
                                      expense.description
                                    }
                                  </p>

                                  <small>
                                    {formatDate(
                                      expense.expenseDate
                                    )}
                                  </small>
                                </div>

                                {role ===
                                  "EMPLOYEE" &&
                                  report.status ===
                                    "DRAFT" && (
                                    <div className="actions">
                                      <button
                                        onClick={() =>
                                          startEditingExpense(
                                            expense
                                          )
                                        }
                                      >
                                        Edit
                                      </button>

                                      <button
                                        onClick={() =>
                                          deleteExpense(
                                            report.id,
                                            expense.id
                                          )
                                        }
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                              </>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                {/* ================= APPROVER ASSIGNMENTS ================= */}

                {role === "APPROVER" &&
                  report.status === "SUBMITTED" && (
                    <div className="panel">
                      <h4>Assigned Approvers</h4>

                      {report.approvers &&
                      report.approvers.length > 0 ? (
                        <ul>
                          {report.approvers.map((assignment) => (
                            <li key={assignment.id}>
                              {assignment.approver.name} (
                              {assignment.approver.email})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No approvers assigned yet.</p>
                      )}

                      <div className="form-row">
                        <select
                          value={selectedApprover[report.id] || ""}
                          onChange={(e) =>
                            setSelectedApprover((current) => ({
                              ...current,
                              [report.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">
                            Select approver
                          </option>

                          {approvers
                            .filter(
                              (approver) =>
                                !report.approvers?.some(
                                  (assignment) =>
                                    assignment.approverId ===
                                    approver.id
                                )
                            )
                            .map((approver) => (
                              <option
                                key={approver.id}
                                value={approver.id}
                              >
                                {approver.name} ({approver.email})
                              </option>
                            ))}
                        </select>

                        <button
                          onClick={() =>
                            assignApproverToReport(report.id)
                          }
                        >
                          Assign Approver
                        </button>
                      </div>
                    </div>
                  )}

                {/* ================= APPROVER ACTIONS ================= */}

                {role === "APPROVER" && (
                  <div className="actions">
                    {report.status ===
                      "SUBMITTED" && (
                      <>
                        <button
                          onClick={() =>
                            approveReport(
                              report.id
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            rejectReport(
                              report.id
                            )
                          }
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {report.status ===
                      "APPROVED" && (
                      <button
                        onClick={() =>
                          payReport(
                            report.id
                          )
                        }
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= ARCHIVED REPORTS ================= */}

      {role === "EMPLOYEE" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Archived Reports</h2>
          </div>

          {archivedReports.length === 0 ? (
            <p>No archived reports.</p>
          ) : (
            <div className="reports">
              {archivedReports.map((report) => (
                <div
                  className="report-card"
                  key={report.id}
                >
                  <div>
                    <h3>{report.title}</h3>

                    <p>
                      Period:{" "}
                      {formatDate(
                        report.startDate
                      )}{" "}
                      —{" "}
                      {formatDate(
                        report.endDate
                      )}
                    </p>

                    <p>
                      Status:{" "}
                      <strong>
                        {report.status}
                      </strong>
                    </p>

                    <p>
                      Total: ₹{report.total}
                    </p>

                    <p>
                      <small>
                        Archived report — history
                        preserved
                      </small>
                    </p>
                  </div>

                  <div className="actions">
                    <button
                      onClick={() =>
                        restoreReport(
                          report.id
                        )
                      }
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= APPROVER ANALYTICS ================= */}

      {role === "APPROVER" && dashboard && (
        <section className="panel">
          <h2>Status Breakdown</h2>

          <div className="breakdown">
            {dashboard.statusBreakdown.map(
              (item) => (
                <div key={item.status}>
                  <strong>
                    {item.status}
                  </strong>

                  <span>
                    {item.count} reports · ₹
                    {item.total}
                  </span>
                </div>
              )
            )}
          </div>

          <h2>Category Breakdown</h2>

          <div className="breakdown">
            {dashboard.categoryBreakdown.map(
              (item) => (
                <div key={item.category}>
                  <strong>
                    {item.category}
                  </strong>

                  <span>
                    {item.count} expenses · ₹
                    {item.total}
                  </span>
                </div>
              )
            )}
          </div>

          <h2>Paid — Last 8 Weeks</h2>

          <div className="weeks">
            {dashboard.paidPerWeek.map(
              (week) => (
                <div
                  key={week.weekStart}
                >
                  <span>
                    {new Date(
                      week.weekStart
                    ).toLocaleDateString()}
                  </span>

                  <strong>
                    ₹{week.total}
                  </strong>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;