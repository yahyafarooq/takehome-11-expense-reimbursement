# Plan

I approached the project as a short, requirement-driven implementation rather than trying to build everything at once.

The main priority was to establish the core data model and backend rules first, then build the frontend around those APIs, and finally spend time on deployment, demo data and requirement verification.

## How did you break the work into sessions?

I broadly divided the work into the following sessions:

### Session 1 — Understand the assignment and plan the system

I first went through all 10 goals and converted them into smaller implementation areas.

I identified the main entities:

- Users
- Expense reports
- Expense lines
- Approver assignments
- History
- Comments
- Alerts

I also identified the important server-side rules before starting the UI.

### Session 2 — Database and authentication

I worked on the PostgreSQL/Prisma setup and the user/role model.

The initial goal was to get authentication working with the two required roles:

- EMPLOYEE
- APPROVER

This established the user identity that the rest of the authorization logic depends on.

### Session 3 — Reports and expenses

I implemented the core employee workflow:

- Create report
- Edit report
- Add expenses
- Edit expenses
- Delete expenses
- Calculate totals
- Submit report
- Archive/restore reports

I focused on ownership and Draft-state checks at this stage.

### Session 4 — Approval workflow

I then implemented the approver functionality:

- Submitted report queue
- Assigned approvers
- Approve
- Reject
- Mark as Paid
- Bulk actions
- CSV export

The main focus here was making sure invalid transitions and self-approval were rejected by the backend.

### Session 5 — Search, dashboard, history and alerts

After the main lifecycle worked, I added the supporting requirements:

- Server-side search
- Filters
- Sorting
- Pagination
- Dashboard metrics
- Status/category breakdowns
- Eight-week paid chart
- History
- Comments
- Stale alerts
- Alert dismissal

### Session 6 — Frontend refinement

I connected the frontend to the backend workflows and polished the main interface.

I focused on making the employee and approver flows understandable without introducing unnecessary functionality.

### Session 7 — Testing and deployment

I then worked through:

- Local builds
- Database connectivity
- Deployment configuration
- Render build issues
- Vercel configuration
- Production API configuration
- Seed/demo data

I also reviewed the application against all 10 assignment goals.

---

## What order did you build in, and why that order?

The implementation order was approximately:

**Database → Authentication → Reports → Expenses → Lifecycle → Approvals → Search/Bulk → Dashboard/History/Alerts → Frontend polish → Deployment → Seed/QA**

I chose this order because the later parts depend heavily on the earlier ones.

For example:

- Reports depend on users.
- Expenses depend on reports.
- Approval depends on report ownership and lifecycle state.
- Dashboard metrics depend on report/expense data.
- History depends on lifecycle transitions.
- Alerts depend on submitted reports and approver assignments.
- The frontend depends on the backend APIs being stable enough to connect to.

Building the backend rules before polishing the UI also helped keep authorization and lifecycle logic on the server instead of accidentally implementing important rules only in React.

---

## What did you estimate versus what it actually took?

I initially expected the project to take roughly **12–15 hours**.

The actual development time was approximately **18–20 hours**.

The additional time mainly went into:

- Debugging Prisma/PostgreSQL connectivity
- Testing authorization and lifecycle edge cases
- Implementing the approval/search/bulk requirements
- Deployment troubleshooting
- Production API configuration
- Preparing realistic seed data
- Reviewing the implementation against all 10 goals
- Frontend refinement

The core feature implementation was relatively straightforward compared with the time spent verifying that the application actually behaved correctly across employee and approver workflows.

---

## What did you cut when you ran short?

I prioritized the mandatory assignment requirements over optional features.

I intentionally did not build:

- Email notifications
- Receipt/file uploads
- Complex multi-level approval chains
- Real-time WebSocket updates
- Microservices
- Advanced notification preferences
- A separate audit/event-streaming infrastructure
- Extensive automated test coverage

The most important thing I protected was the required server-side behavior. I preferred having the required workflows working and deployable rather than adding optional features and leaving core requirements incomplete.

I also identified some cleanup work that could be done with more time, especially splitting the large frontend application component into smaller feature-focused components and adding more automated backend tests.

---

## Final prioritization

My final priority order was:

1. Correct database model
2. Authentication and authorization
3. Employee report/expense workflow
4. Approval lifecycle
5. Required approver functionality
6. Search/filter/pagination
7. Bulk operations and CSV
8. Dashboard
9. History and alerts
10. Frontend polish
11. Deployment
12. Demo data and final verification

This kept the project focused on satisfying the assignment first and improving maintainability and polish where time allowed.