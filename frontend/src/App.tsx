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

interface HistoryEntry {
  id: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
}

interface CommentEntry {
  id: string;
  comment: string;
  createdAt: string;
  author: {
    id: string;
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

function formatMoney(value?: number | string | null) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function inputDate(dateString?: string | null) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function renderStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  return <span className={`status-badge ${s}`}>{status}</span>;
}

function renderCategoryBadge(category: ExpenseCategory) {
  const c = (category || "").toLowerCase();
  return <span className={`category-badge ${c}`}>{category}</span>;
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [role, setRole] = useState<Role>(
    (localStorage.getItem("role") as Role) || "EMPLOYEE"
  );

  /* Auth UI mode */
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("approver@example.com");
  const [password, setPassword] = useState("Password123");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("EMPLOYEE");

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

  /* Goal 6 - Server-side search/filter/sort/pagination */
  const [searchTitle, setSearchTitle] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchOwnerId, setSearchOwnerId] = useState("");
  const [searchApproverId, setSearchApproverId] = useState("");
  const [searchSortBy, setSearchSortBy] = useState<
    "submittedAt" | "status" | "total"
  >("submittedAt");
  const [searchSortOrder, setSearchSortOrder] = useState<"asc" | "desc">("desc");
  const [searchPage, setSearchPage] = useState(1);
  const [searchPageSize, setSearchPageSize] = useState(10);
  const [searchPagination, setSearchPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchMode, setSearchMode] = useState(false);

  /* Goal 7 - Bulk actions */
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  /* Goal 9 - Immutable history and comments */
  const [historyByReport, setHistoryByReport] = useState<
    Record<string, HistoryEntry[]>
  >({});
  const [commentsByReport, setCommentsByReport] = useState<
    Record<string, CommentEntry[]>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedHistory, setExpandedHistory] = useState<
    Record<string, boolean>
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

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && token) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setToken("");
        setMessage("Session expired. Please sign in again.");
      }
      return Promise.reject(error);
    }
  );

  function fillDemoPreset(presetRole: Role) {
    if (presetRole === "EMPLOYEE") {
      setEmail("employee@example.com");
      setPassword("Password123");
    } else {
      setEmail("approver@example.com");
      setPassword("Password123");
    }
    setAuthMode("LOGIN");
  }

  async function login() {
    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
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

  async function registerUserAccount() {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setMessage("Please fill in all registration fields");
      return;
    }

    try {
      await api.post("/auth/register", {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: regRole,
      });

      setMessage("Registration successful! Signing in...");

      const loginRes = await api.post("/auth/login", {
        email: regEmail.trim(),
        password: regPassword.trim(),
      });

      const newToken = loginRes.data.token;
      const newRole = loginRes.data.user.role as Role;

      localStorage.setItem("token", newToken);
      localStorage.setItem("role", newRole);

      setToken(newToken);
      setRole(newRole);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Registration failed"
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
        if (searchMode) {
          await loadSearch(searchPage);
          return;
        }

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

  async function loadSearch(page = searchPage) {
    if (role !== "APPROVER") return;

    try {
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
      setArchivedReports([]);
      setSearchPagination(
        response.data.pagination || {
          page,
          pageSize: searchPageSize,
          total: 0,
          totalPages: 0,
        }
      );
      setSearchPage(page);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to search reports"
      );
    }
  }

  async function loadHistory(reportId: string) {
    try {
      const response = await api.get(`/reports/${reportId}/history`);
      setHistoryByReport((current) => ({
        ...current,
        [reportId]: response.data.history || [],
      }));
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to load report history"
      );
    }
  }

  async function loadComments(reportId: string) {
    try {
      const response = await api.get(`/reports/${reportId}/comments`);
      setCommentsByReport((current) => ({
        ...current,
        [reportId]: response.data.comments || [],
      }));
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to load comments"
      );
    }
  }

  async function addComment(reportId: string) {
    const comment = (commentDrafts[reportId] || "").trim();

    if (!comment) {
      setMessage("Comment cannot be empty");
      return;
    }

    try {
      await api.post(`/reports/${reportId}/comments`, { comment });

      setCommentDrafts((current) => ({
        ...current,
        [reportId]: "",
      }));

      await loadComments(reportId);
      setMessage("Comment added");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to add comment"
      );
    }
  }

  async function toggleHistory(reportId: string) {
    const next = !expandedHistory[reportId];

    setExpandedHistory((current) => ({
      ...current,
      [reportId]: next,
    }));

    if (next) {
      await Promise.all([
        loadHistory(reportId),
        loadComments(reportId),
      ]);
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
    setSearchMode(false);
    loadReports();
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
      setMessage("Rejection reason is required");
      return;
    }

    try {
      const response = await api.patch("/approvals/bulk", {
        reportIds: selectedReports,
        action,
        ...(action === "REJECT"
          ? { reason: bulkReason.trim() }
          : {}),
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

      await loadReports();
      await loadDashboard();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Bulk action failed"
      );
    }
  }

  function toggleReportSelection(reportId: string) {
    setSelectedReports((current) =>
      current.includes(reportId)
        ? current.filter((id) => id !== reportId)
        : [...current, reportId]
    );
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

      setMessage("CSV export downloaded");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || "Failed to export CSV"
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
          <p>Sign in or create an account to continue</p>

          <div className="tab-group" style={{ marginBottom: "1rem" }}>
            <button
              className={authMode === "LOGIN" ? "active" : ""}
              onClick={() => setAuthMode("LOGIN")}
            >
              Sign In
            </button>
            <button
              className={authMode === "REGISTER" ? "active" : ""}
              onClick={() => setAuthMode("REGISTER")}
            >
              Sign Up
            </button>
          </div>

          {authMode === "LOGIN" ? (
            <>
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={login}>Sign In</button>
            </>
          ) : (
            <>
              <input
                placeholder="Full Name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              <input
                placeholder="Email Address"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as Role)}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="APPROVER">Approver</option>
              </select>
              <button onClick={registerUserAccount}>Create Account</button>
            </>
          )}

          {message && <p className="message">{message}</p>}

          <div className="demo-presets">
            <small>Demo Quick Fill:</small>
            <div>
              <button onClick={() => fillDemoPreset("EMPLOYEE")}>
                Employee Demo
              </button>
              <button onClick={() => fillDemoPreset("APPROVER")}>
                Approver Demo
              </button>
            </div>
          </div>
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

          {role === "APPROVER" && (
            <span className="alert-badge" title="Stale Approval Alerts">
              🔔 {alerts.length} alert{alerts.length === 1 ? "" : "s"}
            </span>
          )}
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
                {formatMoney(dashboard.summary.reimbursementsDue)}
              </strong>
            </div>

            <div className="stat-card">
              <span>Approved This Week</span>
              <strong>
                {formatMoney(dashboard.summary.approvedThisWeek)}
              </strong>
            </div>

            <div className="stat-card">
              <span>Paid This Week</span>
              <strong>
                {formatMoney(dashboard.summary.paidThisWeek)}
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

      {/* ================= GOAL 6 / 7 SEARCH + BULK ================= */}

      {role === "APPROVER" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Find Reports</h2>
            <div className="actions">
              <button
                onClick={() => {
                  setSearchMode(false);
                  setSearchPage(1);
                  loadReports();
                }}
              >
                Queue
              </button>
              <button
                onClick={() => {
                  setSearchMode(true);
                  setSearchPage(1);
                  loadSearch(1);
                }}
              >
                Search
              </button>
              <button onClick={downloadCsv}>
                Export Approved CSV
              </button>
            </div>
          </div>

          <div className="form-row">
            <input
              placeholder="Search title..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
            />

            <select
              value={searchOwnerId}
              onChange={(e) => setSearchOwnerId(e.target.value)}
            >
              <option value="">All owners</option>
              {Array.from(
                new Map(
                  reports
                    .filter((report) => report.owner?.id)
                    .map((report) => [report.owner!.id, report.owner!])
                ).values()
              ).map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} ({owner.email})
                </option>
              ))}
            </select>

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
              {approvers.map((approver) => (
                <option key={approver.id} value={approver.id}>
                  {approver.name}
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
              <option value="submittedAt">Sort: Submitted</option>
              <option value="status">Sort: Status</option>
              <option value="total">Sort: Total</option>
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
                const value = Number(e.target.value);
                setSearchPageSize(value);
                setSearchPage(1);
              }}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <button
              onClick={() => {
                setSearchMode(true);
                loadSearch(1);
              }}
            >
              Apply Filters
            </button>
            <button onClick={clearSearchFilters}>Clear Filters</button>
          </div>

          {searchMode && (
            <>
              <p>
                Total matches: <strong>{searchPagination.total}</strong>
              </p>

              <div className="actions">
                <button
                  disabled={searchPage <= 1}
                  onClick={() => loadSearch(searchPage - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {searchPagination.page} of{" "}
                  {searchPagination.totalPages || 1}
                </span>

                <button
                  disabled={
                    searchPage >= searchPagination.totalPages
                  }
                  onClick={() => loadSearch(searchPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {!searchMode && (
            <p>
              Use Search for server-side title, status, approver,
              sorting and pagination.
            </p>
          )}
        </section>
      )}

      {role === "APPROVER" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Bulk Actions</h2>
            <div className="actions">
              <span>{selectedReports.length} selected</span>
              <button onClick={selectAllSubmittedReports}>
                Select All Submitted
              </button>
            </div>
          </div>

          <div className="form-row">
            <input
              placeholder="Rejection reason for bulk reject"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />

            <button
              onClick={() => bulkAction("APPROVE")}
              disabled={selectedReports.length === 0}
            >
              Bulk Approve
            </button>

            <button
              onClick={() => bulkAction("REJECT")}
              disabled={selectedReports.length === 0}
            >
              Bulk Reject
            </button>

            <button onClick={() => setSelectedReports([])}>
              Clear Selection
            </button>
          </div>

          {bulkResults && (
            <div className="bulk-results" style={{ marginTop: "1rem" }}>
              <h4>Bulk Action Breakdown</h4>
              <ul>
                {bulkResults.map((r: any) => (
                  <li key={r.reportId}>
                    Report #{r.reportId.slice(-6)}:{" "}
                    {r.success ? (
                      <span style={{ color: "#047857" }}>✓ Success</span>
                    ) : (
                      <span style={{ color: "#b91c1c" }}>
                        ✗ Failed ({r.reason || "Error"})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <button onClick={() => setBulkResults(null)}>Dismiss Breakdown</button>
            </div>
          )}
        </section>
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
                {role === "APPROVER" && report.status === "SUBMITTED" && (
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report.id)}
                      onChange={() => toggleReportSelection(report.id)}
                    />
                    Select for bulk action
                  </label>
                )}

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
                      Status: {renderStatusBadge(report.status)}
                    </p>

                    <p>
                      Total: <strong>{formatMoney(report.total)}</strong>
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
                                    {formatMoney(expense.amount)}
                                  </strong>

                                  <span> · {renderCategoryBadge(expense.category)}</span>

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

                {/* ================= GOAL 9 HISTORY + COMMENTS ================= */}

                <div className="actions">
                  <button onClick={() => toggleHistory(report.id)}>
                    {expandedHistory[report.id]
                      ? "Hide History"
                      : "History & Comments"}
                  </button>
                </div>

                {expandedHistory[report.id] && (
                  <div className="panel">
                    <h4>Immutable Status History</h4>

                    {(historyByReport[report.id] || []).length === 0 ? (
                      <p>No history entries.</p>
                    ) : (
                      <div className="breakdown">
                        {(historyByReport[report.id] || []).map((entry) => (
                          <div key={entry.id}>
                            <strong>
                              {entry.oldStatus || "START"} →{" "}
                              {entry.newStatus || "-"}
                            </strong>
                            <span>
                              {" "}
                              · {entry.actor.name} ·{" "}
                              {formatDate(entry.createdAt)}
                              {entry.reason
                                ? ` · Reason: ${entry.reason}`
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <h4>Comments</h4>

                    {(commentsByReport[report.id] || []).length === 0 ? (
                      <p>No comments yet.</p>
                    ) : (
                      (commentsByReport[report.id] || []).map((item) => (
                        <div key={item.id}>
                          <strong>{item.author.name}</strong>
                          <span>
                            {" "}
                            · {formatDate(item.createdAt)}
                          </span>
                          <p>{item.comment}</p>
                        </div>
                      ))
                    )}

                    <div className="form-row">
                      <input
                        placeholder="Add a comment..."
                        value={commentDrafts[report.id] || ""}
                        onChange={(e) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [report.id]: e.target.value,
                          }))
                        }
                      />
                      <button onClick={() => addComment(report.id)}>
                        Add Comment
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
                      Status: {renderStatusBadge(report.status)}
                    </p>

                    <p>
                      Total: {formatMoney(report.total)}
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
                    {renderStatusBadge(item.status)}
                  </strong>

                  <span>
                    {item.count} reports · {formatMoney(item.total)}
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
                    {renderCategoryBadge(item.category as ExpenseCategory)}
                  </strong>

                  <span>
                    {item.count} expenses · {formatMoney(item.total)}
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
                    {formatMoney(week.total)}
                  </strong>
                </div>
              )
            )}
          </div>

          <h2>Paid Trend</h2>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "10px",
              minHeight: "180px",
              padding: "16px 0",
            }}
          >
            {dashboard.paidPerWeek.map((week) => {
              const max = Math.max(
                ...dashboard.paidPerWeek.map((item) => Number(item.total) || 0),
                1
              );
              const height =
                Math.max((Number(week.total) / max) * 140, 4);

              return (
                <div
                  key={`chart-${week.weekStart}`}
                  title={`${formatDate(week.weekStart)}: ${formatMoney(week.total)}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <strong style={{ fontSize: "12px" }}>
                    {formatMoney(week.total)}
                  </strong>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "48px",
                      height: `${height}px`,
                      borderRadius: "6px 6px 2px 2px",
                      background: "currentColor",
                      opacity: 0.75,
                    }}
                  />
                  <small>
                    {new Date(week.weekStart).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;