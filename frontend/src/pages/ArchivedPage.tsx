import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatMoney, formatDate, renderStatusBadge } from "../lib/utils";
import type { Report } from "../lib/types";

export default function ArchivedPage() {
  const { api, setMessage } = useAuth();
  const [archivedReports, setArchivedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadArchivedReports() {
    try {
      setLoading(true);
      const response = await api.get("/reports/my");
      setArchivedReports(response.data.archivedReports || []);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to load archived reports");
    } finally {
      setLoading(false);
    }
  }

  async function restoreReport(reportId: string) {
    try {
      await api.patch(`/reports/${reportId}/restore`);
      setMessage("Report restored successfully to active reports");
      await loadArchivedReports();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to restore report");
    }
  }

  useEffect(() => {
    loadArchivedReports();
  }, []);

  return (
    <div className="page archived-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Archived Expense Reports</h1>
          <p className="page-subtitle">
            Archived drafts are preserved here. You can restore them anytime to continue editing or submit for reimbursement.
          </p>
        </div>
        <button onClick={loadArchivedReports}>Refresh</button>
      </div>

      <section className="panel">
        {loading ? (
          <p className="loading-text">Loading archived reports...</p>
        ) : archivedReports.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">No archived reports found.</p>
            <Link to="/" className="btn-secondary" style={{ display: "inline-block", marginTop: "12px" }}>
              ← Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="report-list">
            {archivedReports.map((report) => (
              <div key={report.id} className="report-row">
                <div className="report-row-main">
                  <Link to={`/reports/${report.id}`} className="report-title-link">
                    <strong>{report.title}</strong>
                  </Link>
                  <span className="report-row-meta">
                    Period: {formatDate(report.startDate)} — {formatDate(report.endDate)}
                    {report.submittedAt && ` · Submitted ${formatDate(report.submittedAt)}`}
                  </span>
                </div>
                <div className="report-row-right">
                  <span className="report-row-amount">{formatMoney(report.total)}</span>
                  {renderStatusBadge(report.status)}
                  <button onClick={() => restoreReport(report.id)}>Restore</button>
                  <Link to={`/reports/${report.id}`} className="view-link">
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
