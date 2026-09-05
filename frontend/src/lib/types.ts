export type Role = "EMPLOYEE" | "APPROVER";

export type ExpenseCategory =
  | "TRAVEL"
  | "MEALS"
  | "HOTEL"
  | "SUPPLIES"
  | "OTHER";

export interface ExpenseLine {
  id: string;
  expenseDate: string;
  amount: number | string;
  category: ExpenseCategory;
  description: string;
}

export interface Report {
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

export interface Approver {
  id: string;
  name: string;
  email: string;
}

export interface HistoryEntry {
  id: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

export interface CommentEntry {
  id: string;
  comment: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
}

export interface Dashboard {
  summary: {
    awaitingApproval: number;
    reimbursementsDue: number;
    approvedThisWeek: number;
    paidThisWeek: number;
  };
  statusBreakdown: { status: string; count: number; total: number }[];
  categoryBreakdown: { category: string; count: number; total: number }[];
  paidPerWeek: { weekStart: string; total: number }[];
}

export interface Alert {
  reportId: string;
  title: string;
  staleDays: number;
  owner: { name: string; email: string };
}

export const CATEGORIES: ExpenseCategory[] = [
  "TRAVEL",
  "MEALS",
  "HOTEL",
  "SUPPLIES",
  "OTHER",
];
