# Schema

The application uses PostgreSQL with Prisma.

The schema is intentionally relational because the main entities have clear relationships between users, reports, expenses, approvers, history and comments.

## Table by table: what columns and types does each one have?

### User

Stores application users and their roles.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| name | String | User's display name |
| email | String | Unique login email |
| passwordHash | String | Hashed password |
| role | UserRole | `EMPLOYEE` or `APPROVER` |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

A user can own multiple expense reports, be assigned to multiple reports as an approver, create comments and create history entries.

---

### ExpenseReport

Represents one reimbursement report.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| ownerId | String | Foreign key to User |
| title | String | Report title |
| startDate | DateTime | Start of report date range |
| endDate | DateTime | End of report date range |
| status | ReportStatus | Current lifecycle state |
| total | Decimal(12,2) | Server-maintained reimbursement total |
| archived | Boolean | Whether the report is archived |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| submittedAt | DateTime? | Time when report was submitted |

The report belongs to one user and can contain multiple expenses, approver assignments, history entries and comments.

---

### ExpenseLine

Represents an individual expense inside a report.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| reportId | String | Foreign key to ExpenseReport |
| expenseDate | DateTime | Date of expense |
| amount | Decimal(12,2) | Expense amount |
| category | ExpenseCategory | Fixed expense category |
| description | String | Expense description |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

The report total is derived from these expense lines by the backend.

---

### ReportApprover

Represents an assignment between an expense report and an approver.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| reportId | String | Foreign key to ExpenseReport |
| approverId | String | Foreign key to User |
| assignedAt | DateTime | Assignment timestamp |

This is the join table used to support multiple approvers per report and multiple reports per approver.

---

### ReportHistory

Stores immutable report status transitions.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| reportId | String | Foreign key to ExpenseReport |
| actorId | String | User who caused the transition |
| oldStatus | ReportStatus? | Previous status |
| newStatus | ReportStatus? | New status |
| reason | String? | Optional rejection reason |
| createdAt | DateTime | History timestamp |

History records are appended rather than edited/deleted through the application.

---

### Comment

Stores comments made against reports.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| reportId | String | Foreign key to ExpenseReport |
| authorId | String | User who wrote the comment |
| comment | String | Comment text |
| createdAt | DateTime | Creation timestamp |

Comments are associated with both the report and the author.

---

### AlertDismissal

Stores when an approver dismissed a stale-report alert.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| reportId | String | Foreign key to ExpenseReport |
| approverId | String | Foreign key to User |
| dismissedAt | DateTime | Dismissal timestamp |

The report/approver pair is unique so an approver has one current dismissal record for a particular report.

---

## Enums

### UserRole

```text
EMPLOYEE
APPROVER