# Submission

## Links

- **GitHub repository:** https://github.com/yahyafarooq/takehome-11-expense-reimbursement
- **Live application:** https://takehome-11-expense-reimbursement.vercel.app

## Notes for the reviewer

The application is deployed with the frontend on Vercel and the backend on Render.

The backend is hosted on Render's free tier, so the service may sleep after a period of inactivity. If the first API request takes a little longer than usual, please allow some time for the backend to wake up and retry if necessary.

The application includes seeded demo data covering different reimbursement lifecycle states, including Draft, Submitted, Approved, Paid, archived, and stale submitted reports.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Employee | yahya@example.com | Password123 |
| Approver | approver@example.com | Password123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React + TypeScript + Vite | Fast, component-based frontend with type safety and a straightforward development/build workflow |
| Backend | Node.js + Express + TypeScript | Lightweight REST API with server-side authorization and business-rule enforcement |
| Database | PostgreSQL + Prisma ORM | Relational data model suitable for users, reports, expenses, approvals, history, comments, and alerts |
| Hosting | Vercel + Render + Supabase PostgreSQL | Separate frontend/backend deployment with managed PostgreSQL and free-tier hosting |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Email/password authentication with EMPLOYEE and APPROVER roles. Users are restricted to their own reports, while approvers can review reports submitted by others. Server-side role and ownership checks are implemented, including prevention of self-approval/rejection. |
| 2 | Reports | Done | Reports support title, date range, ownership, editing before submission, archiving, and restoring. Archived reports are removed from the default active view while their history and data are preserved. |
| 3 | Expense lines | Done | Expense lines support date, amount, fixed category, and description. Lines can be added, edited, and removed while the report is in Draft. Report totals are calculated server-side from expense lines. |
| 4 | Report lifecycle | Done | Implemented Draft → Submitted → Approved/Rejected and Approved → Paid. Submission is owner-only, approval/rejection is approver-only, rejection requires a reason, and invalid transitions are rejected server-side. |
| 5 | Assigned approvers | Done | Reports can have multiple assigned approvers. Approvers can be assigned to multiple reports and can view both the complete submitted queue and their assigned submitted queue. |
| 6 | Finding reports | Done | Server-side search, status/owner/approver filters, sorting, and pagination are implemented for approver report search. Pagination includes total matches. |
| 7 | Bulk actions and CSV export | Done | Approvers can bulk approve/reject submitted reports with per-report processing/results. Approved reports awaiting payment can be exported as CSV. |
| 8 | Dashboard | Done | Approver dashboard includes awaiting approval, reimbursements due, approved this week, paid this week, status/category breakdowns, and an 8-week paid reimbursement view. |
| 9 | History | Partial | Immutable status history and comments are implemented and displayed. Status changes record old/new status, actor, timestamp, and rejection reason where applicable. Access-control hardening for every history/comment read path could be improved further. |
| 10 | Stale alerts | Done | Submitted reports can become stale after the configured period. Assigned approvers receive alerts, can dismiss an alert, and the alert can return after the configured additional period if the report remains undecided. |

## How much time did you actually spend?

Approximately 18 to 20 hours.

## What would you do next, with another 12 hours?

With another 12 hours, I would focus on:

1. Complete a full end-to-end production QA pass for every employee and approver workflow.
2. Add automated backend/API tests for authorization, ownership checks, lifecycle transitions, bulk operations, alerts, and history access.
3. Improve history/comment access control and verify that every report-related endpoint consistently enforces the required visibility rules.
4. Improve the approver search/filter experience, particularly making owner filter options independent of the currently loaded page.
5. Add stronger production observability and clearer error handling for frontend/backend/network failures.
6. Add more comprehensive seeded scenarios for rejected reports, multiple approvers, dismissed/reappearing alerts, and edge cases.
7. Perform a final security and dependency review before production handoff.

## What are you least happy with in this codebase, and why?

The main area I am least happy with is the amount of UI and workflow logic currently concentrated in the main frontend application component. It works for the take-home scope, but the component has grown significantly as the requirements were implemented.

With more time, I would split the frontend into smaller feature-focused components and hooks, particularly for reports, approvals, dashboard, history, and alerts. This would make the codebase easier to maintain and test without changing the underlying functionality.

I would also strengthen the automated test coverage around authorization and lifecycle transitions. These are important parts of the application because many requirements depend on server-side enforcement rather than only frontend behavior.