import type { ExpenseCategory } from "./types";

export function formatMoney(value?: number | string | null) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function inputDate(dateString?: string | null) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function renderStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  return <span className={`status-badge ${s}`}>{status}</span>;
}

export function renderCategoryBadge(category: ExpenseCategory | string) {
  const c = (category || "").toLowerCase();
  return <span className={`category-badge ${c}`}>{category}</span>;
}
