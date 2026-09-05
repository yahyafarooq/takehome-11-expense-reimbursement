import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { formatMoney, formatDate, renderStatusBadge, renderCategoryBadge } from "../lib/utils";
import type { Dashboard, ExpenseCategory } from "../lib/types";

export default function AnalyticsPage() {
  const { api, setMessage } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await api.get("/dashboard");
      setDashboard(response.data);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to load dashboard analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p className="loading-text">Loading analytics...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page">
        <h1 className="page-title">Analytics</h1>
        <p className="empty-text">No analytics data available.</p>
      </div>
    );
  }

  const maxPaid = Math.max(
    ...dashboard.paidPerWeek.map((item) => Number(item.total) || 0),
    1
  );

  return (
    <div className="page analytics-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Expense Analytics & Trends</h1>
          <p className="page-subtitle">
            Real-time financial metrics, status breakdowns, and historical reimbursement trends.
          </p>
        </div>
        <button onClick={loadDashboard}>Refresh Data</button>
      </div>

      {/* Summary KPI Cards */}
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

      {/* Paid Trend Visual Bar Chart */}
      <section className="panel">
        <h2>Weekly Paid Trend (Last 8 Weeks)</h2>
        <div className="chart-container">
          <div className="bars-wrapper">
            {dashboard.paidPerWeek.map((week) => {
              const currentTotal = Number(week.total) || 0;
              const barHeight = Math.max((currentTotal / maxPaid) * 160, 6);

              return (
                <div key={`chart-${week.weekStart}`} className="bar-col">
                  <span className="bar-amount">{formatMoney(week.total)}</span>
                  <div
                    className="bar-fill"
                    style={{ height: `${barHeight}px` }}
                    title={`${formatDate(week.weekStart)}: ${formatMoney(week.total)}`}
                  />
                  <span className="bar-label">
                    {new Date(week.weekStart).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Breakdowns Grid */}
      <div className="analytics-grid">
        {/* Status Breakdown */}
        <section className="panel">
          <h2>Status Breakdown</h2>
          <div className="breakdown-list">
            {dashboard.statusBreakdown.map((item) => (
              <div key={item.status} className="breakdown-item">
                <div className="breakdown-tag">
                  {renderStatusBadge(item.status)}
                </div>
                <div className="breakdown-stats">
                  <strong>{item.count} reports</strong>
                  <span>{formatMoney(item.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="panel">
          <h2>Category Breakdown</h2>
          <div className="breakdown-list">
            {dashboard.categoryBreakdown.map((item) => (
              <div key={item.category} className="breakdown-item">
                <div className="breakdown-tag">
                  {renderCategoryBadge(item.category as ExpenseCategory)}
                </div>
                <div className="breakdown-stats">
                  <strong>{item.count} expenses</strong>
                  <span>{formatMoney(item.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Detailed Paid Per Week Table */}
      <section className="panel">
        <h2>Weekly Reimbursement Log</h2>
        <div className="weeks-table">
          <div className="weeks-header">
            <span>Week Starting</span>
            <span>Total Disbursed</span>
          </div>
          {dashboard.paidPerWeek.map((week) => (
            <div key={week.weekStart} className="weeks-row">
              <span>{formatDate(week.weekStart)}</span>
              <strong>{formatMoney(week.total)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
