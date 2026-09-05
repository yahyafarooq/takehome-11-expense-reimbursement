import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatMoney, formatDate, renderStatusBadge } from "../lib/utils";
import type { Report, Approver } from "../lib/types";

export default function ReportsPage() {
  const { api, setMessage } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(false);

  /* Filter & Search state */
  const [searchTitle, setSearchTitle] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchOwnerId, setSearchOwnerId] = useState("");
  const [searchApproverId, setSearchApproverId] = useState("");
  const [searchSortBy, setSearchSortBy] = useState<"submittedAt" | "status" | "total">("submittedAt");
  const [searchSortOrder, setSearchSortOrder] = useState<"asc" | "desc">("desc");
  const [searchPage, setSearchPage] = useState(1);
  const [searchPageSize, setSearchPageSize] = useState(10);
  const [searchPagination, setSearchPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  /* Bulk action state */
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  async function loadApprovers() {
    try {
      const response = await api.get("/auth/approvers");
      setApprovers(response.data.approvers || []);
    } catch {
      // silent catch
    }
  }

  async function loadSearch(page = searchPage) {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        pageSize: searchPageSize,
        sortBy: searchSortBy,
        sortOrder: searchSortOrder,
      };

      if (searchTitle.trim()) {
        params.search = searchTitle.trim();
        params.title = searchTitle.trim();
      }
      if (searchStatus) params.status = searchStatus;
      if (searchOwnerId) params.ownerId = searchOwnerId;
      if (searchApproverId) params.approverId = searchApproverId;

      const response = await api.get("/approvals/search", { params });

      setReports(response.data.reports || []);
      setSearchPagination(
        response.data.pagination || {
          page,
          pageSize: searchPageSize,
          total: 0,
          totalPages: 1,
        }
      );
      setSearchPage(page);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to search reports");
    } finally {
      setLoading(false);
    }
  }

  function clearSearchFilters() {
    setSearchTitle("");
    setSearchStatus("");
    setSearchOwnerId("");
    setSearchApproverId("");
    setSearchSortBy("submittedAt");
    setSearchSortOrder("desc");
    setSearchPage(1);
    loadSearch(1);
  }

  async function downloadCsv() {
    try {
      const response = await api.get("/approvals/export/approved", {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "text/csv" })
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "approved-awaiting-payment.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setMessage("CSV export downloaded successfully");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to export CSV");
    }
  }

  function toggleReportSelection(reportId: string) {
    setSelectedReports((current) =>
      current.includes(reportId)
        ? current.filter((id) => id !== reportId)
        : [...current, reportId]
    );
  }

  function selectAllSubmittedReports() {
    const submittedIds = reports
      .filter((r) => r.status === "SUBMITTED")
      .map((r) => r.id);
    setSelectedReports(submittedIds);
  }

  async function bulkAction(action: "APPROVE" | "REJECT") {
    if (selectedReports.length === 0) {
      setMessage("Select at least one submitted report");
      return;
    }
    if (action === "REJECT" && !bulkReason.trim()) {
      setMessage("Rejection reason is required for bulk rejection");
      return;
    }

    try {
      const response = await api.patch("/approvals/bulk", {
        reportIds: selectedReports,
        action,
        ...(action === "REJECT" ? { reason: bulkReason.trim() } : {}),
      });

      const results = response.data.results || [];
      const successful = results.filter((item: any) => item.success).length;
      const failed = results.length - successful;

      setBulkResults(results);
      setSelectedReports([]);
      setBulkReason("");
      setMessage(
        `Bulk ${action.toLowerCase()} complete: ${successful} succeeded, ${failed} failed`
      );
      await loadSearch(searchPage);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Bulk action failed");
    }
  }

  useEffect(() => {
    loadApprovers();
    loadSearch(1);
  }, []);

  return (
    <div className="page reports-search-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Find & Review Reports</h1>
          <p className="page-subtitle">
            Search across all submissions, filter by criteria, perform bulk actions, or export CSV.
          </p>
        </div>
        <button onClick={downloadCsv} className="btn-secondary">
          📥 Export Approved CSV
        </button>
      </div>

      {/* Search & Filter Controls */}
      <section className="panel">
        <div className="form-row">
          <input
            placeholder="Search report title..."
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchPage(1);
                loadSearch(1);
              }
            }}
          />

          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
          </select>

          <select
            value={searchApproverId}
            onChange={(e) => setSearchApproverId(e.target.value)}
          >
            <option value="">All approvers</option>
            {approvers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={searchSortBy}
            onChange={(e) =>
              setSearchSortBy(
                e.target.value as "submittedAt" | "status" | "total"
              )
            }
          >
            <option value="submittedAt">Sort: Submitted Date</option>
            <option value="status">Sort: Status</option>
            <option value="total">Sort: Total Amount</option>
          </select>

          <select
            value={searchSortOrder}
            onChange={(e) =>
              setSearchSortOrder(e.target.value as "asc" | "desc")
            }
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          <select
            value={searchPageSize}
            onChange={(e) => {
              setSearchPageSize(Number(e.target.value));
              setSearchPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <button onClick={() => { setSearchPage(1); loadSearch(1); }}>
            Apply Filters
          </button>
          <button onClick={clearSearchFilters} className="tab-inactive">
            Clear
          </button>
        </div>
      </section>

      {/* Bulk Actions Panel */}
      <section className="panel bulk-panel">
        <div className="panel-header">
          <h2>Bulk Operations</h2>
          <div className="actions">
            <span>
              <strong>{selectedReports.length}</strong> selected
            </span>
            <button onClick={selectAllSubmittedReports} className="tab-inactive">
              Select All Submitted
            </button>
            {selectedReports.length > 0 && (
              <button onClick={() => setSelectedReports([])} className="tab-inactive">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="form-row" style={{ marginTop: "12px" }}>
          <input
            placeholder="Reason required for bulk rejection..."
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
          />
          <button
            onClick={() => bulkAction("APPROVE")}
            disabled={selectedReports.length === 0}
          >
            Bulk Approve ({selectedReports.length})
          </button>
          <button
            onClick={() => bulkAction("REJECT")}
            disabled={selectedReports.length === 0}
            className="tab-inactive"
          >
            Bulk Reject ({selectedReports.length})
          </button>
        </div>

        {bulkResults && (
          <div className="bulk-results-card" style={{ marginTop: "16px" }}>
            <h4>Bulk Action Summary:</h4>
            <ul>
              {bulkResults.map((r: any) => (
                <li key={r.reportId}>
                  Report #{r.reportId.slice(-6)}:{" "}
                  {r.success ? (
                    <span style={{ color: "#059669", fontWeight: 600 }}>✓ Success</span>
                  ) : (
                    <span style={{ color: "#dc2626", fontWeight: 600 }}>
                      ✗ Failed ({r.reason || "Error"})
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button onClick={() => setBulkResults(null)} className="tab-inactive" style={{ marginTop: "8px" }}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Reports Table / List */}
      <section className="panel">
        <div className="panel-header">
          <h2>Results ({searchPagination.total})</h2>
          <div className="actions">
            <button
              disabled={searchPage <= 1 || loading}
              onClick={() => loadSearch(searchPage - 1)}
            >
              Previous
            </button>
            <span>
              Page {searchPagination.page} of {searchPagination.totalPages || 1}
            </span>
            <button
              disabled={searchPage >= searchPagination.totalPages || loading}
              onClick={() => loadSearch(searchPage + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="empty-text">No reports match your filters.</p>
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <div key={report.id} className="report-row report-row-selectable">
                {report.status === "SUBMITTED" && (
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report.id)}
                    onChange={() => toggleReportSelection(report.id)}
                    style={{ marginRight: "12px", width: "18px", height: "18px" }}
                  />
                )}
                <div className="report-row-main">
                  <Link to={`/reports/${report.id}`} className="report-title-link">
                    <strong>{report.title}</strong>
                  </Link>
                  <span className="report-row-meta">
                    {report.owner ? `${report.owner.name} · ` : ""}
                    Period: {formatDate(report.startDate)} — {formatDate(report.endDate)}
                    {report.submittedAt && ` · Submitted ${formatDate(report.submittedAt)}`}
                  </span>
                </div>
                <div className="report-row-right">
                  <span className="report-row-amount">{formatMoney(report.total)}</span>
                  {renderStatusBadge(report.status)}
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
