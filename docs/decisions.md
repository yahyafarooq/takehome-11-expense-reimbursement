# Decisions

These are the main engineering decisions that shaped the implementation. I included decisions where there was a reasonable alternative and I had to choose an approach based on the project requirements, simplicity and development time.

## Decision 1 — Use a single Express backend

- **Chose:** Use one Node.js + Express + TypeScript backend organized into feature areas such as auth, reports, approvals, dashboard, history and alerts.
- **Rejected:** Splitting the application into multiple backend services.
- **Why:** The application is relatively small and the assignment is focused on functionality and server-side business rules. A single backend keeps deployment, local development and debugging simpler while still allowing the code to be separated logically by feature.

## Decision 2 — Keep business-rule validation on the server

- **Chose:** Enforce ownership, roles, lifecycle transitions, approval rules and expense total calculations in backend services.
- **Rejected:** Relying primarily on frontend controls to prevent invalid actions.
- **Why:** Frontend restrictions can be bypassed by calling the API directly. The assignment specifically requires server-side enforcement, so the backend is treated as the source of truth for permissions and state transitions.

## Decision 3 — Calculate report totals from expense lines

- **Chose:** Store the report total but recalculate it on the server whenever an expense line is created, edited or deleted.
- **Rejected:** Accepting a total supplied by the frontend.
- **Why:** The reimbursement amount should be derived from the actual expense lines. This prevents a client from directly setting or manipulating the final total.

## Decision 4 — Use PostgreSQL with Prisma

- **Chose:** PostgreSQL as the database and Prisma as the ORM/data-access layer.
- **Rejected:** Using a document database or writing raw SQL for most application operations.
- **Why:** The application has clear relational entities such as users, reports, expenses, approver assignments, history and comments. PostgreSQL fits these relationships well, while Prisma provides typed database access and makes the schema easier to maintain.

## Decision 5 — Use JWT authentication

- **Chose:** Email/password authentication with JWT-based authenticated API requests.
- **Rejected:** Building a custom session-storage system or introducing a third-party authentication platform.
- **Why:** JWT authentication was sufficient for the two required roles and allowed the backend to identify the user and role on each protected request without introducing another external service.

## Decision 6 — Support multiple approvers through a join table

- **Chose:** Model report/approver assignment using a separate `ReportApprover` table.
- **Rejected:** Storing a single approver ID directly on the report.
- **Why:** The requirement allows any number of approvers to be assigned to a report, and the same approver can be assigned to many reports. A join table naturally represents this many-to-many relationship and also leaves room for assignment metadata such as `assignedAt`.

## Decision 7 — Keep report history immutable

- **Chose:** Store status transitions as append-only history records containing the old status, new status, actor, timestamp and optional reason.
- **Rejected:** Updating or deleting previous history entries when the report changes.
- **Why:** The history requirement is intended to provide an audit trail. Keeping each transition as a separate record preserves what happened over time instead of only storing the current state.

## Decision 8 — Use in-application stale alerts

- **Chose:** Store alert dismissals and calculate stale submitted-report alerts in the backend.
- **Rejected:** Building an email notification system or background notification service.
- **Why:** The assignment specifically requires stale reports to appear in an alerts area and allows assigned approvers to dismiss them. An in-application mechanism satisfies that requirement without adding unnecessary external infrastructure.

## Decision 9 — Use server-side search and pagination

- **Chose:** Perform report search, filtering, sorting and pagination in the backend.
- **Rejected:** Loading all reports into the browser and filtering them using React.
- **Why:** The assignment explicitly requires server-side search/filtering/pagination. It also makes the design more appropriate for larger datasets because the browser does not need to load every report.

## Decision 10 — Keep the seed non-destructive

- **Chose:** Create an idempotent seed script that inserts/updates representative demo data without resetting the database.
- **Rejected:** Using a database reset as part of seeding.
- **Why:** The deployed database already contains application data, and a production demo seed should not destroy existing information. The seed should be safe to run again when preparing the reviewer environment.

## Decision 11 — Initially keep the frontend concentrated in the main application component

- **Chose:** Keep a significant amount of frontend workflow logic in the main React application while completing the take-home.
- **Rejected:** Spending significant development time splitting every workflow into separate components/hooks before completing the required functionality.
- **Why:** With limited time, I prioritized completing and verifying the required workflows over a larger frontend refactor.

- **Later reversed:** After the implementation grew, I changed my view on this trade-off. I would now split the frontend into feature-focused components and hooks for reports, approvals, dashboard, history and alerts. The current implementation works, but this would make the code easier to maintain and test.

## Decision 12 — Deploy frontend and backend separately

- **Chose:** Deploy the React frontend to Vercel and the Express backend to Render, with PostgreSQL hosted on Supabase.
- **Rejected:** Hosting the entire application on a single platform.
- **Why:** The frontend and backend have different deployment needs. Separating them also kept the deployment model straightforward and allowed the frontend to be served independently from the API.

These decisions were made with the take-home scope in mind: keep the architecture understandable, satisfy the required business rules, and avoid infrastructure that would not provide meaningful value for the assignment.