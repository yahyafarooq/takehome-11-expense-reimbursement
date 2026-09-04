import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type Role = "EMPLOYEE" | "APPROVER";

interface Report {
  id: string;
  title: string;
  status: string;
  total: number | string;
  owner?: {
    name: string;
    email: string;
  };
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
  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);

  const [alerts, setAlerts] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

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
    setAlerts([]);
  }

  async function loadReports() {
    try {
      if (role === "APPROVER") {
        const response = await api.get("/approvals/search");

        setReports(response.data.reports || []);
      } else {
        const response = await api.get("/reports/my");

        setReports(response.data.reports || []);
      }
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load reports"
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

    try {
      const response = await api.post("/reports", {
        title: title.trim(),
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      });

      setMessage(
        `Report created: ${response.data.report.title}`
      );

      setTitle("");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to create report"
      );
    }
  }

  async function addExpense(reportId: string) {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Please enter a valid expense amount");
      return;
    }

    try {
      await api.post(`/reports/${reportId}/expenses`, {
        expenseDate: new Date().toISOString(),
        amount: numericAmount,
        category: "TRAVEL",
        description: "Demo expense",
      });

      setAmount("");

      setMessage("Expense added successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to add expense"
      );
    }
  }

  async function submitReport(reportId: string) {
    try {
      await api.post(`/reports/${reportId}/submit`);

      setMessage("Report submitted successfully");

      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Failed to submit report"
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
      loadDashboard();
      loadAlerts();
    }
  }, [token, role]);

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

      {/* APPROVER DASHBOARD */}
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
                ₹
                {dashboard.summary.reimbursementsDue}
              </strong>
            </div>

            <div className="stat-card">
              <span>Approved This Week</span>
              <strong>
                ₹
                {dashboard.summary.approvedThisWeek}
              </strong>
            </div>

            <div className="stat-card">
              <span>Paid This Week</span>
              <strong>
                ₹
                {dashboard.summary.paidThisWeek}
              </strong>
            </div>
          </section>

          {/* STALE ALERTS */}
          <section className="panel">
            <h2>
              Stale Alerts ({alerts.length})
            </h2>

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

      {/* EMPLOYEE CREATE REPORT */}
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

            <button onClick={createReport}>
              Create Draft
            </button>
          </div>
        </section>
      )}

      {/* REPORT LIST */}
      <section className="panel">
        <div className="panel-header">
          <h2>
            {role === "APPROVER"
              ? "All Expense Reports"
              : "My Expense Reports"}
          </h2>

          <button onClick={loadReports}>
            Refresh
          </button>
        </div>

        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          <div className="reports">
            {reports.map((report) => (
              <div
                className="report-card"
                key={report.id}
              >
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
                    Status:{" "}
                    <strong>
                      {report.status}
                    </strong>
                  </p>

                  <p>
                    Total: ₹{report.total}
                  </p>
                </div>

                {/* APPROVER ACTIONS */}
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

                {/* EMPLOYEE DRAFT ACTIONS */}
                {role === "EMPLOYEE" &&
                  report.status === "DRAFT" && (
                    <div className="actions">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Expense amount"
                        value={amount}
                        onChange={(e) =>
                          setAmount(
                            e.target.value
                          )
                        }
                      />

                      <button
                        onClick={() =>
                          addExpense(
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
                  )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* APPROVER ANALYTICS */}
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
                <div key={week.weekStart}>
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