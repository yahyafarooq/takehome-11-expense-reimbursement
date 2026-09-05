# Architecture

The application is a small full-stack web application with a React frontend, an Express/TypeScript backend, and a PostgreSQL database accessed through Prisma.

## What are the moving pieces, and how do they talk to each other?

There are three main application layers:

### 1. Frontend

The frontend is built using React, TypeScript and Vite.

It provides the interface for both employees and approvers, including:

- Authentication
- Creating and editing reports
- Managing expense lines
- Submitting reports
- Viewing approval queues
- Searching and filtering reports
- Approving/rejecting reports
- Bulk approval/rejection
- Dashboard metrics
- History and comments
- Stale alerts

The frontend communicates with the backend using HTTP REST API requests.

The frontend does not contain the final business-rule authority. For example, even if an Approve button is hidden from an employee, the backend still verifies the user's role and permissions when an approval request is received.

### 2. Backend

The backend is built with Node.js, Express and TypeScript.

It is responsible for:

- Authentication
- JWT handling
- Role-based authorization
- Report ownership checks
- Report lifecycle validation
- Expense validation
- Server-side total calculation
- Approver assignment
- Search/filter/sort/pagination
- Bulk operations
- CSV export
- Dashboard calculations
- History and comments
- Stale alerts

The backend is organized into feature areas such as authentication, reports, approvals, dashboard, history and alerts.

The backend communicates with PostgreSQL through Prisma.

### 3. Database

PostgreSQL stores the persistent application state.

The main data includes:

- Users
- Expense reports
- Expense lines
- Report approver assignments
- Report history
- Comments
- Alert dismissals

Prisma provides the database access layer and maps the TypeScript application models to PostgreSQL.

The overall production request flow is:

Browser
→ Vercel frontend
→ Render backend API
→ Prisma
→ Supabase PostgreSQL

Responses travel back through the same layers to the browser.

---

## Where does each piece run?

| Component | Environment | Purpose |
|---|---|---|
| React + Vite frontend | Vercel | Serves the web application |
| Node.js + Express backend | Render | Handles API requests and business logic |
| PostgreSQL | Supabase | Stores application data |
| Prisma | Inside the Render backend | Database access and queries |

The local development setup runs the frontend and backend separately:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

In production, the frontend uses the `VITE_API_URL` environment variable to communicate with the deployed backend.

Secrets such as `DATABASE_URL` and `JWT_SECRET` are kept in backend environment variables and are not exposed through the frontend.

---

## What is the request path for one representative user action, end to end?

A representative action is an approver approving a submitted expense report.

### Step 1 — Authentication

The user enters their email and password in the React application.

The frontend sends the credentials to the backend authentication endpoint.

The backend:

1. Finds the user.
2. Verifies the password.
3. Determines the user's role.
4. Creates an authentication token.

The frontend then uses the token for authenticated API requests.

### Step 2 — Opening the report

The approver requests the submitted report list.

The backend authenticates the request and checks that the user has the `APPROVER` role.

The report service retrieves submitted reports together with the information needed by the approval interface.

### Step 3 — Approving the report

The approver clicks the Approve action.

The frontend sends an authenticated approval request to the backend.

The request passes through:

1. Authentication middleware
2. Role/authorization middleware
3. Approval service

The approval service verifies:

- The report exists.
- The report is currently `SUBMITTED`.
- The current user is an approver.
- The current user is not the report owner.
- The current user is assigned to the report.

If the checks fail, the backend rejects the request with an explanatory error.

### Step 4 — Persisting the change

If all checks pass, the backend changes:

`SUBMITTED → APPROVED`

It also creates a history entry containing the status transition and actor.

Prisma persists the changes to PostgreSQL.

### Step 5 — Updating the frontend

The backend returns the result to the React application.

The frontend refreshes the relevant report/queue information and displays the new status.

The important architectural principle is that **authorization and lifecycle rules are enforced on the server**, rather than trusting the frontend.

---

## What did you decide not to build, and why?

I intentionally kept the application focused on the assignment requirements.

### Email notifications

I did not build email notifications because the assignment requires in-app stale alerts rather than an email notification system.

Adding email infrastructure would introduce another external dependency and configuration requirement without helping satisfy the core workflow.

### Receipt/file uploads

Expense lines only require:

- Date
- Amount
- Category
- Description

Receipt upload/storage was therefore outside the required scope.

### Complex approval chains

The requirement supports assigning multiple approvers to a report, but does not require sequential approval stages or hierarchical approval chains.

I therefore kept approval assignment simple.

### Real-time updates

I did not add WebSockets or another real-time messaging layer.

The application can retrieve the current state through normal REST API requests, which is sufficient for this take-home scope.

### Microservices

I did not split authentication, reports, approvals, dashboard and alerts into separate services.

For an application of this size, a single Express backend keeps development and deployment simpler while still allowing the code to be organized by feature.

### Advanced notification preferences

I implemented the required stale-alert behavior, including dismissal and reappearance, without creating a full notification preference system.

### Separate audit/event infrastructure

The assignment requires immutable report history, so that is stored in the database. I did not introduce a separate event-streaming or audit platform because it would add complexity without being necessary for the current requirements.

Overall, the architecture was deliberately kept small and practical while putting the important business rules and security checks on the backend.