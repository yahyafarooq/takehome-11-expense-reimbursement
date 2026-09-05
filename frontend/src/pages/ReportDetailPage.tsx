import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  formatMoney,
  formatDate,
  inputDate,
  renderStatusBadge,
  renderCategoryBadge,
} from "../lib/utils";
import {
  type Report,
  type ExpenseLine,
  type Approver,
  type HistoryEntry,
  type CommentEntry,
  type ExpenseCategory,
  CATEGORIES,
} from "../lib/types";

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { role, api, setMessage } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  /* Edit report state */
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  /* Add expense state */
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("TRAVEL");
  const [description, setDescription] = useState("");

  /* Edit expense state */
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseCategory, setEditExpenseCategory] =
    useState<ExpenseCategory>("TRAVEL");
  const [editExpenseDescription, setEditExpenseDescription] = useState("");

  /* Approver assignment state */
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState("");

  /* History & Comments state */
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [commentDraft, setCommentDraft] = useState("");

  async function loadReportData() {
    if (!reportId) return;
    try {
      setLoading(true);
      const response = await api.get(`/reports/${reportId}`);
      setReport(response.data.report);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovers() {
    if (role !== "APPROVER") return;
    try {
      const response = await api.get("/auth/approvers");
      setApprovers(response.data.approvers || []);
    } catch {
      // approvers load failure handled silently
    }
  }

  async function loadHistoryAndComments() {
    if (!reportId) return;
    try {
      const [histRes, commRes] = await Promise.all([
        api.get(`/reports/${reportId}/history`),
        api.get(`/reports/${reportId}/comments`),
      ]);
      setHistory(histRes.data.history || []);
      setComments(commRes.data.comments || []);
    } catch {
      // silent catch
    }
  }

  useEffect(() => {
    loadReportData();
    loadHistoryAndComments();
    if (role === "APPROVER") {
      loadApprovers();
    }
  }, [reportId, role]);

  /* ================= EMPLOYEE ACTIONS ================= */

  function startEditingReport() {
    if (!report) return;
    setEditTitle(report.title);
    setEditStartDate(inputDate(report.startDate));
    setEditEndDate(inputDate(report.endDate));
    setIsEditingReport(true);
  }

  async function saveReportEdit() {
    if (!reportId || !editTitle.trim()) {
      setMessage("Report title is required");
      return;
    }
    if (!editStartDate || !editEndDate) {
      setMessage("Start and end dates are required");
      return;
    }
    if (new Date(editEndDate) < new Date(editStartDate)) {
      setMessage("End date cannot be before start date");
      return;
    }

    try {
      await api.patch(`/reports/${reportId}`, {
        title: editTitle.trim(),
        startDate: new Date(`${editStartDate}T00:00:00`).toISOString(),
        endDate: new Date(`${editEndDate}T23:59:59`).toISOString(),
      });
      setIsEditingReport(false);
      setMessage("Report updated successfully");
      await loadReportData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to update report");
    }
  }

  async function submitReport() {
    if (!reportId) return;
    try {
      await api.post(`/reports/${reportId}/submit`);
      setMessage("Report submitted successfully for approval");
      await loadReportData();
      await loadHistoryAndComments();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to submit report");
    }
  }

  async function archiveReport() {
    if (!reportId) return;
    if (!window.confirm("Are you sure you want to archive this report?")) return;
    try {
      await api.patch(`/reports/${reportId}/archive`);
      setMessage("Report archived successfully");
      navigate("/archived");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to archive report");
    }
  }

  async function restoreReport() {
    if (!reportId) return;
    try {
      await api.patch(`/reports/${reportId}/restore`);
      setMessage("Report restored successfully");
      await loadReportData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to restore report");
    }
  }

  /* ================= EXPENSE ACTIONS ================= */

  async function addExpense() {
    if (!reportId) return;
    const numAmount = Number(amount);
    if (!expenseDate) {
      setMessage("Please select an expense date");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setMessage("Please enter a valid expense amount");
      return;
    }
    if (!description.trim()) {
      setMessage("Please enter an expense description");
      return;
    }

    try {
      await api.post(`/reports/${reportId}/expenses`, {
        expenseDate: new Date(`${expenseDate}T00:00:00`).toISOString(),
        amount: numAmount,
        category,
        description: description.trim(),
      });
      setIsAddingExpense(false);
      setAmount("");
      setDescription("");
      setMessage("Expense added successfully");
      await loadReportData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to add expense");
    }
  }

  function startEditingExpense(expense: ExpenseLine) {
    setEditingExpenseId(expense.id);
    setEditExpenseDate(inputDate(expense.expenseDate));
    setEditExpenseAmount(String(expense.amount));
    setEditExpenseCategory(expense.category);
    setEditExpenseDescription(expense.description);
  }

  async function saveExpenseEdit(expenseId: string) {
    if (!reportId) return;
    const numAmount = Number(editExpenseAmount);
    if (!editExpenseDate || !numAmount || numAmount <= 0 || !editExpenseDescription.trim()) {
      setMessage("Please fill all expense fields correctly");
      return;
    }

    try {
      await api.patch(`/reports/${reportId}/expenses/${expenseId}`, {
        expenseDate: new Date(`${editExpenseDate}T00:00:00`).toISOString(),
        amount: numAmount,
        category: editExpenseCategory,
        description: editExpenseDescription.trim(),
      });
      setEditingExpenseId(null);
      setMessage("Expense updated successfully");
      await loadReportData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to update expense");
    }
  }

  async function deleteExpense(expenseId: string) {
    if (!reportId) return;
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.delete(`/reports/${reportId}/expenses/${expenseId}`);
      setMessage("Expense deleted successfully");
      await loadReportData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to delete expense");
    }
  }

  /* ================= APPROVER ACTIONS ================= */

  async function assignApprover() {
    if (!reportId || !selectedApproverId) {
      setMessage("Please select an approver");
      return;
    }
    try {
      await api.post(`/approvals/${reportId}/approvers`, {
        approverId: selectedApproverId,
      });
      setSelectedApproverId("");
      setMessage("Approver assigned successfully");
      await loadReportData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to assign approver");
    }
  }

  async function approveReport() {
    if (!reportId) return;
    try {
      await api.patch(`/approvals/${reportId}/approve`);
      setMessage("Report approved successfully");
      await loadReportData();
      await loadHistoryAndComments();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to approve report");
    }
  }

  async function rejectReport() {
    if (!reportId) return;
    const reason = window.prompt("Enter rejection reason:");
    if (!reason || !reason.trim()) return;

    try {
      await api.patch(`/approvals/${reportId}/reject`, { reason: reason.trim() });
      setMessage("Report rejected");
      await loadReportData();
      await loadHistoryAndComments();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to reject report");
    }
  }

  async function payReport() {
    if (!reportId) return;
    try {
      await api.patch(`/approvals/${reportId}/pay`);
      setMessage("Report marked as paid");
      await loadReportData();
      await loadHistoryAndComments();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to mark as paid");
    }
  }

  /* ================= COMMENTS ================= */

  async function addComment() {
    if (!reportId || !commentDraft.trim()) {
      setMessage("Comment cannot be empty");
      return;
    }
    try {
      await api.post(`/reports/${reportId}/comments`, {
        comment: commentDraft.trim(),
      });
      setCommentDraft("");
      setMessage("Comment added");
      await loadHistoryAndComments();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Failed to add comment");
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="loading-text">Loading report details...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <p className="empty-text">Report not found or access denied.</p>
      </div>
    );
  }

  const isEmployee = role === "EMPLOYEE";
  const isApprover = role === "APPROVER";
  const isDraft = report.status === "DRAFT";
  const isSubmitted = report.status === "SUBMITTED";
  const isApproved = report.status === "APPROVED";

  return (
    <div className="page report-detail-page">
      <div className="detail-navigation">
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
        {isApprover && (
          <Link to="/search" className="back-link" style={{ marginLeft: "12px" }}>
            ← Back to All Reports
          </Link>
        )}
      </div>

      {/* Report Header Card */}
      <section className="panel detail-header-panel">
        {isEditingReport ? (
          <div className="edit-report-form">
            <h2>Edit Expense Report</h2>
            <div className="form-row">
              <div>
                <label>Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label>Start Date</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div>
                <label>End Date</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="actions" style={{ marginTop: "12px" }}>
              <button onClick={saveReportEdit}>Save Changes</button>
              <button className="tab-inactive" onClick={() => setIsEditingReport(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="detail-header-content">
            <div className="detail-title-section">
              <div className="detail-badges">
                {renderStatusBadge(report.status)}
                {report.archived && <span className="category-badge other">Archived</span>}
              </div>
              <h1>{report.title}</h1>
              {report.owner && (
                <p className="detail-meta">
                  Submitted by <strong>{report.owner.name}</strong> ({report.owner.email})
                </p>
              )}
              <p className="detail-meta">
                Period: {formatDate(report.startDate)} — {formatDate(report.endDate)}
                {report.submittedAt && ` · Submitted: ${formatDate(report.submittedAt)}`}
              </p>
            </div>

            <div className="detail-amount-section">
              <span className="amount-label">Total Amount</span>
              <strong className="amount-value">{formatMoney(report.total)}</strong>

              {/* Action buttons */}
              <div className="actions" style={{ marginTop: "12px", justifyContent: "flex-end" }}>
                {isEmployee && isDraft && (
                  <>
                    <button onClick={startEditingReport}>Edit Info</button>
                    <button onClick={archiveReport} className="tab-inactive">
                      Archive
                    </button>
                    <button onClick={submitReport}>Submit Report</button>
                  </>
                )}

                {isEmployee && report.archived && (
                  <button onClick={restoreReport}>Restore Report</button>
                )}

                {isApprover && isSubmitted && (
                  <>
                    <button onClick={approveReport}>Approve</button>
                    <button onClick={rejectReport} className="tab-inactive">
                      Reject
                    </button>
                  </>
                )}

                {isApprover && isApproved && (
                  <button onClick={payReport}>Mark as Paid</button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Approver Assignment Panel (for Approver) */}
      {isApprover && isSubmitted && (
        <section className="panel">
          <div className="panel-header">
            <h2>Assigned Approvers</h2>
          </div>
          {report.approvers && report.approvers.length > 0 ? (
            <ul className="approvers-list">
              {report.approvers.map((item) => (
                <li key={item.id}>
                  👤 <strong>{item.approver.name}</strong> ({item.approver.email})
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">No specific approvers assigned yet (open to any approver).</p>
          )}

          <div className="form-row" style={{ marginTop: "12px" }}>
            <select
              value={selectedApproverId}
              onChange={(e) => setSelectedApproverId(e.target.value)}
            >
              <option value="">Select approver to assign...</option>
              {approvers
                .filter((a) => !report.approvers?.some((ass) => ass.approverId === a.id))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
            </select>
            <button onClick={assignApprover} disabled={!selectedApproverId}>
              Assign Approver
            </button>
          </div>
        </section>
      )}

      {/* Expenses Breakdown Panel */}
      <section className="panel">
        <div className="panel-header">
          <h2>Expense Items ({report.expenseLines?.length || 0})</h2>
          {isEmployee && isDraft && (
            <button onClick={() => setIsAddingExpense(!isAddingExpense)}>
              {isAddingExpense ? "Cancel" : "+ Add Expense Line"}
            </button>
          )}
        </div>

        {/* Add Expense Form */}
        {isAddingExpense && (
          <div className="expense-form" style={{ marginBottom: "20px" }}>
            <h4>Add New Expense</h4>
            <div className="form-row">
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div>
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Description</label>
                <input
                  placeholder="What was this expense for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="actions" style={{ marginTop: "12px" }}>
              <button onClick={addExpense}>Save Expense</button>
              <button className="tab-inactive" onClick={() => setIsAddingExpense(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Expenses List */}
        {(!report.expenseLines || report.expenseLines.length === 0) ? (
          <p className="empty-text">No expense items added yet.</p>
        ) : (
          <div className="expenses-table-wrapper">
            <div className="expenses-list">
              {report.expenseLines.map((expense) => (
                <div key={expense.id} className="expense-item-row">
                  {editingExpenseId === expense.id ? (
                    <div className="expense-edit-form" style={{ width: "100%" }}>
                      <div className="form-row">
                        <div>
                          <label>Date</label>
                          <input
                            type="date"
                            value={editExpenseDate}
                            onChange={(e) => setEditExpenseDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label>Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editExpenseAmount}
                            onChange={(e) => setEditExpenseAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <label>Category</label>
                          <select
                            value={editExpenseCategory}
                            onChange={(e) =>
                              setEditExpenseCategory(e.target.value as ExpenseCategory)
                            }
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label>Description</label>
                          <input
                            value={editExpenseDescription}
                            onChange={(e) => setEditExpenseDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="actions" style={{ marginTop: "8px" }}>
                        <button onClick={() => saveExpenseEdit(expense.id)}>Save</button>
                        <button
                          className="tab-inactive"
                          onClick={() => setEditingExpenseId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="expense-info">
                        <div className="expense-primary">
                          <strong>{formatMoney(expense.amount)}</strong>
                          {renderCategoryBadge(expense.category)}
                          <span className="expense-date">{formatDate(expense.expenseDate)}</span>
                        </div>
                        <p className="expense-desc">{expense.description}</p>
                      </div>

                      {isEmployee && isDraft && (
                        <div className="actions">
                          <button onClick={() => startEditingExpense(expense)}>Edit</button>
                          <button
                            className="tab-inactive"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* History & Comments Panel */}
      <section className="panel">
        <h2>Activity & History</h2>

        {/* Status History */}
        <div className="history-section" style={{ marginBottom: "24px" }}>
          <h4>Status Timeline</h4>
          {history.length === 0 ? (
            <p className="empty-text">No status transitions recorded yet.</p>
          ) : (
            <div className="timeline">
              {history.map((item) => (
                <div key={item.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <strong>
                      {item.oldStatus || "INITIAL"} → {item.newStatus}
                    </strong>
                    <span className="timeline-meta">
                      by {item.actor.name} on {formatDate(item.createdAt)}
                    </span>
                    {item.reason && <p className="timeline-reason">Reason: {item.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <h4>Discussion & Notes</h4>
          {comments.length === 0 ? (
            <p className="empty-text">No comments on this report yet.</p>
          ) : (
            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-bubble">
                  <div className="comment-header">
                    <strong>{c.author.name}</strong>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                  <p>{c.comment}</p>
                </div>
              ))}
            </div>
          )}

          <div className="form-row" style={{ marginTop: "16px" }}>
            <input
              placeholder="Write a comment or note..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <button onClick={addComment}>Send Comment</button>
          </div>
        </div>
      </section>
    </div>
  );
}
