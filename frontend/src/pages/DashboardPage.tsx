import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatMoney, formatDate, renderStatusBadge } from "../lib/utils";
import type { Report, Dashboard, Alert } from "../lib/types";

export default function DashboardPage() {
  const { role, api, setMessage } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [queue, setQueue] = useState<"ALL" | "ASSIGNED">("ALL");

  /* Employee create report form */
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  async function loadReports() {
    try {
      if (role === "APPROVER") {
        const endpoint =
          queue === "ASSIGNED"
            ? "/approvals/submitted/assigned"
            : "/approvals/submitted";
        const response = await api.get(endpoint);
        setReports(response.data.reports || []);
      } else {
        const response = await api.get("/reports/my");
        setReports(response.data.reports || []);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to load reports");
    }
  }

  async function loadDashboard() {
    if (role !== "APPROVER") return;
    try {
      const response = await api.get("/dashboard");
      setDashboard(response.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to load dashboard"
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

  async function dismissAlert(reportId: string) {
    try {
      await api.patch(`/alerts/${reportId}/dismiss`);
      await loadAlerts();
      setMessage("Alert dismissed");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to dismiss alert"
      );
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
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${endDate}T23:59:59`).toISOString(),
      });
      setMessage(`Report created: ${response.data.report.title}`);
      setTitle("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
      await loadReports();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to create report"
      );
    }
  }

  useEffect(() => {
    loadReports();
    if (role === "APPROVER") {
      loadDashboard();
      loadAlerts();
    }
  }, [queue]);

  /* ================= APPROVER DASHBOARD ================= */
  if (role === "APPROVER") {
    return (
      <div className="page dashboard-page">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Approver Dashboard</h1>
            <p className="page-subtitle">
              Overview of pending reimbursement approvals, queue status, and critical alerts.
            </p>
          </div>
          <div className="header-actions">
            <Link to="/search" className="btn-secondary">
              🔍 Find & Bulk Actions
            </Link>
            <Link to="/analytics" className="btn-secondary">
              📈 Analytics & Trends
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {dashboard && (
          <section className="stats">
            <div className="stat-card">
              <span>Awaiting Approval</span>
              <strong>{dashboard.summary.awaitingApproval}</strong>
            </div>
            <div className="stat-card">
              <span>Reimbursements Due</span>
              <strong>{formatMoney(dashboard.summary.reimbursementsDue)}</strong>
            </div>
            <div className="stat-card">
              <span>Approved This Week</span>
              <strong>{formatMoney(dashboard.summary.approvedThisWeek)}</strong>
            </div>
            <div className="stat-card">
              <span>Paid This Week</span>
              <strong>{formatMoney(dashboard.summary.paidThisWeek)}</strong>
            </div>
          </section>
        )}

        {/* Stale Alerts */}
        <section className="panel">
          <div className="panel-header">
            <h2>🔔 Stale Submission Alerts ({alerts.length})</h2>
            <button onClick={loadAlerts}>Refresh</button>
          </div>

          {alerts.length === 0 ? (
            <p className="empty-text">No stale alerts — all caught up!</p>
          ) : (
            alerts.map((alert) => (
              <div className="alert" key={alert.reportId}>
                <div>
                  <Link to={`/reports/${alert.reportId}`} className="alert-link">
                    <strong>{alert.title}</strong>
                  </Link>
                  <p>
                    {alert.owner.name} · {alert.staleDays} days old awaiting action
                  </p>
                </div>
                <div className="actions">
                  <Link to={`/reports/${alert.reportId}`} className="view-link">
                    Review →
                  </Link>
                  <button onClick={() => dismissAlert(alert.reportId)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Submitted Reports Queue */}
        <section className="panel">
          <div className="panel-header">
            <h2>Submitted Reports Queue</h2>
            <div className="actions">
              <button
                onClick={() => setQueue("ALL")}
                className={queue === "ALL" ? "" : "tab-inactive"}
              >
                All Submitted
              </button>
              <button
                onClick={() => setQueue("ASSIGNED")}
                className={queue === "ASSIGNED" ? "" : "tab-inactive"}
              >
                My Assigned
              </button>
              <button onClick={loadReports}>Refresh</button>
            </div>
          </div>

          {reports.length === 0 ? (
            <p className="empty-text">No submitted reports currently waiting in this queue.</p>
          ) : (
            <div className="report-list">
              {reports.map((report) => (
                <Link
                  to={`/reports/${report.id}`}
                  className="report-row"
                  key={report.id}
                >
                  <div className="report-row-main">
                    <strong>{report.title}</strong>
                    {report.owner && (
                      <span className="report-row-meta">
                        Owner: {report.owner.name} · Submitted: {formatDate(report.submittedAt)}
                      </span>
                    )}
                  </div>
                  <div className="report-row-right">
                    <span className="report-row-amount">
                      {formatMoney(report.total)}
                    </span>
                    {renderStatusBadge(report.status)}
                    <span className="view-link">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ================= EMPLOYEE DASHBOARD ================= */
  return (
    <div className="page dashboard-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Employee Portal</h1>
          <p className="page-subtitle">
            Create expense reports, manage line items, and track your reimbursement claims.
          </p>
        </div>
        <Link to="/archived" className="btn-secondary">
          📦 View Archived ({reports.filter(r => r.archived).length || 0})
        </Link>
      </div>

      {/* Create Report */}
      <section className="panel">
        <h2>Create New Expense Report</h2>
        <div className="form-row">
          <input
            placeholder="Report title (e.g. Q3 Sales Conference)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div>
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button onClick={createReport}>Create Draft</button>
        </div>
      </section>

      {/* My Reports */}
      <section className="panel">
        <div className="panel-header">
          <h2>My Active Expense Reports</h2>
          <button onClick={loadReports}>Refresh</button>
        </div>

        {reports.length === 0 ? (
          <p className="empty-text">
            No active reports yet. Create one above to get started!
          </p>
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <Link
                to={`/reports/${report.id}`}
                className="report-row"
                key={report.id}
              >
                <div className="report-row-main">
                  <strong>{report.title}</strong>
                  <span className="report-row-meta">
                    Period: {formatDate(report.startDate)} — {formatDate(report.endDate)}
                    {report.submittedAt && ` · Submitted ${formatDate(report.submittedAt)}`}
                  </span>
                </div>
                <div className="report-row-right">
                  <span className="report-row-amount">
                    {formatMoney(report.total)}
                  </span>
                  {renderStatusBadge(report.status)}
                  <span className="view-link">View Details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
