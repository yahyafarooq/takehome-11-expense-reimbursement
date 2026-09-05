# AI prompts

I primarily used AI to clarify requirements, reason through implementation approaches, debug errors, review code against the assignment goals, identify edge cases, troubleshoot deployment issues, and improve parts of the implementation. The generated suggestions were reviewed and tested locally before being adopted.

The prompts below are listed in the order in which they were used and focus on the significant areas where AI assistance was useful.

## 1. Understanding the requirements and planning the implementation

### Prompt

I have an Expense Reimbursement take-home assignment with 10 mandatory goals. Help me break down the requirements into backend, database, API, frontend, and deployment tasks. Identify the important authorization rules, lifecycle transitions, edge cases, and server-side validations I should be careful about. Help me create a practical implementation plan.

### What I got

The AI helped break the assignment into smaller engineering tasks and highlighted important rules such as:

- Employee vs. Approver permissions
- Report ownership
- Server-side total calculation
- Valid report lifecycle transitions
- Prevention of self-approval/rejection
- Assigned approvers
- Server-side search, filtering, sorting and pagination
- Bulk approval/rejection
- Immutable history
- Stale approval alerts

This gave me a clearer checklist to work through while implementing the application.

### What I corrected

I used the output as a development checklist rather than directly implementing everything from the response. I made implementation decisions based on the existing project structure and verified each requirement while building and testing the application.

---

## 2. Clarifying backend authorization and report ownership

### Prompt

Review the report and expense APIs against the assignment requirements. Check whether an employee can access or modify another employee's report or expenses, and identify where ownership and role checks need to happen on the server. Focus on finding security gaps rather than rewriting the implementation.

### What I got

The AI identified the important authorization boundaries and suggested checking:

- The authenticated user's ID against the report owner
- The report status before allowing edits
- The user's role before approval actions
- Ownership before submitting, archiving or restoring
- Report ownership before adding or modifying expenses

### What I corrected

I reviewed the existing service and controller logic and added or strengthened the server-side checks where required. I then tested the relevant workflows instead of relying only on frontend restrictions.

This was particularly useful because hiding UI actions is not sufficient for the assignment; the API itself needs to reject unauthorized requests.

---

## 3. Debugging the expense total calculation

### Prompt

Check the expense/report implementation against the requirement that the report total must always be calculated on the server from the expense lines. Identify any way a client could directly control the total and explain how to make the calculation reliable when an expense is added, edited or deleted.

### What I got

The AI pointed out that the report total should not be accepted as a trusted value from the frontend. Instead, it should be recalculated from the stored expense lines whenever the lines change.

### What I corrected

I kept the report total as a server-controlled value and made the expense create, update and delete flows recalculate the report total from the database.

I also verified that the frontend does not act as the source of truth for the final reimbursement amount.

---

## 4. Reviewing report lifecycle and approval edge cases

### Prompt

Review the report lifecycle implementation against these transitions: Draft → Submitted → Approved/Rejected and Approved → Paid. Identify invalid transitions and authorization edge cases that the backend should reject. Pay special attention to rejection requiring a reason and an approver never being allowed to approve or reject their own report.

### What I got

The AI helped identify the lifecycle rules and several edge cases that needed explicit server-side handling.

### What I corrected

I reviewed the approval service and ensured that:

- Only the owner can submit a report.
- Only submitted reports can be approved or rejected.
- Only approvers can approve/reject.
- An approver cannot approve or reject their own report.
- Rejection requires a reason.
- Rejected reports return to Draft.
- Only approved reports can be marked Paid.
- Invalid transitions return an explanatory error.

These checks were implemented and tested at the API/service level.

---

## 5. Understanding and implementing search, filtering and pagination

### Prompt

I need to satisfy the report discovery requirement. Explain how to implement server-side search by title, filters for status/owner/approver, sorting and pagination while also returning the total number of matching reports. Point out common mistakes that would accidentally make part of this client-side.

### What I got

The AI explained how the query should be constructed on the backend and how pagination metadata such as total matches and total pages should be returned.

### What I corrected

I implemented the query handling in the backend and connected the frontend to the API parameters.

I also reviewed the frontend to ensure that filtering and pagination were not simply being performed on an already-loaded list of reports.

---

## 6. Debugging bulk approval/rejection behavior

### Prompt

Review my bulk approval/rejection implementation. Each selected report should be processed independently and server-side validation should still apply to every report. If one report fails because the approver owns it, the other valid reports should still be processed. What should the response contain so the UI can clearly explain individual failures?

### What I got

The AI helped reason about treating bulk actions as multiple independent report operations rather than assuming that the entire batch succeeds or fails together.

### What I corrected

During review, I noticed that the initial failure information did not clearly identify the owner's name for an owner-conflict failure.

I adjusted the response/result handling so individual reports return meaningful success or failure information, including the relevant owner-conflict case.

---

## 7. Debugging database and Prisma connection issues

### Prompt

Help me debug a Prisma 7 PostgreSQL connection problem. The project is using Supabase PostgreSQL and the existing PrismaPg adapter. I want to identify whether the problem is caused by the Prisma configuration, environment variables, or network connectivity. Do not change the schema unnecessarily.

### What I got

The AI helped separate application/configuration issues from network-level connectivity problems and reviewed the Prisma 7 adapter configuration.

### What I corrected

I tested the connection independently and determined that part of the problem was network connectivity rather than an application bug.

After switching to a working network connection, I re-tested the database connection and continued development without unnecessarily changing the database schema.

---

## 8. Debugging the production TypeScript/Render build

### Prompt

My application builds locally but the Render production build is failing with missing TypeScript declarations for packages such as Express, CORS, bcrypt and jsonwebtoken. Help me identify why this happens and suggest the smallest deployment-side fix without unnecessarily changing the application dependencies.

### What I got

The AI identified that the required TypeScript declaration packages were development dependencies and that the production build environment was not installing them.

### What I corrected

Instead of moving packages around unnecessarily, I changed the Render build command to explicitly install development dependencies before generating Prisma and running the TypeScript build:

`npm install --include=dev && npx prisma generate && npm run build`

The deployment build then completed successfully.

---

## 9. Debugging the deployed frontend API issue

### Prompt

The deployed Vercel frontend is sending requests such as `/api/auth/login` to the Vercel domain and returning HTTP 405, while my Express backend is deployed separately on Render. Help me identify why this is happening and how the frontend should be configured for the production backend.

### What I got

The AI helped identify that the frontend was falling back to its local/default API URL behavior because the production `VITE_API_URL` environment variable had not been configured correctly.

### What I corrected

I verified that the frontend already supported `VITE_API_URL` and configured the Vercel environment variable to point to the deployed Render API:

`VITE_API_URL=https://expense-reimbursement-backend.onrender.com/api`

I then triggered a new deployment and planned to verify the authentication flow against the deployed backend.

---

## 10. Creating and debugging seed data

### Prompt

I need representative demo data for the deployed Expense Reimbursement application. Help me design an idempotent Prisma seed that creates demo employee/approver users and reports covering Draft, Submitted, Approved, Paid, archived and stale submitted scenarios, along with expenses, assignments, history and comments. Do not reset or destroy existing data.

### What I got

The AI helped structure a non-destructive seed script and suggested representative scenarios that would make the deployed application easier for a reviewer to evaluate.

### What I corrected

The first attempt to run the seed exposed a simple project configuration issue:

`npm run seed`

returned:

`npm error Missing script: "seed"`

I checked the project configuration, added the missing `seed` script and installed `tsx` as a development dependency.

After the correction, the seed ran successfully and populated the database without resetting it.

---

## 11. Reviewing the complete implementation against the assignment

### Prompt

Review the current Expense Reimbursement implementation against all 10 assignment goals. Do not assume that something is complete just because there is corresponding UI. Identify missing server-side validation, authorization gaps, lifecycle edge cases, deployment issues and requirements that still need testing.

### What I got

The AI provided a requirement-by-requirement review and highlighted areas that deserved additional verification, particularly around authorization, history access, lifecycle transitions, alerts and deployment configuration.

### What I corrected

I treated this as a code-review checklist rather than as an automatic sign-off.

I manually tested the identified areas, fixed issues where necessary, and recorded remaining limitations honestly rather than marking every requirement as complete.

One example was the history/comment read-access logic, which I identified as an area that could use further access-control hardening and therefore marked Goal 9 as Partial in the submission.

---

## 12. Overall use of AI

AI was used throughout the project as a **development assistant and debugging/review tool**, not as a one-shot code generator.

My workflow was generally:

1. Understand the requirement myself.
2. Implement the feature in the project.
3. Use AI when I was stuck, needed to reason about an approach, encountered an error, or wanted a second review.
4. Apply only the suggestions that made sense for the existing codebase.
5. Run/build/test the application locally.
6. Investigate and correct issues that appeared.
7. Review the result against the original assignment requirement.

This approach helped me use AI efficiently for problem-solving while keeping the implementation, testing and final engineering decisions under my control.