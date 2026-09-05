import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱 Starting database seed...");

  const passwordHash = await bcrypt.hash("Password123", 10);

  // ------------------------------------------------------------
  // 1. DEMO USERS
  // ------------------------------------------------------------

  const employee = await prisma.user.upsert({
    where: {
      email: "yahya@example.com",
    },
    update: {
      name: "Yahya",
      role: "EMPLOYEE",
      passwordHash,
    },
    create: {
      name: "Yahya",
      email: "yahya@example.com",
      role: "EMPLOYEE",
      passwordHash,
    },
  });

  const approver = await prisma.user.upsert({
    where: {
      email: "approver@example.com",
    },
    update: {
      name: "Demo Approver",
      role: "APPROVER",
      passwordHash,
    },
    create: {
      name: "Demo Approver",
      email: "approver@example.com",
      role: "APPROVER",
      passwordHash,
    },
  });

  console.log(`✓ Employee: ${employee.email}`);
  console.log(`✓ Approver: ${approver.email}`);

  // ------------------------------------------------------------
  // 2. HELPERS
  // ------------------------------------------------------------

  async function createReport(
    title: string,
    status:
      | "DRAFT"
      | "SUBMITTED"
      | "APPROVED"
      | "PAID",
    startDate: Date,
    endDate: Date,
    expenses: Array<{
      expenseDate: Date;
      amount: number;
      category:
        | "TRAVEL"
        | "MEALS"
        | "HOTEL"
        | "SUPPLIES"
        | "OTHER";
      description: string;
    }>,
    options?: {
      submittedAt?: Date;
      archived?: boolean;
      assignApprover?: boolean;
      history?: boolean;
      comments?: boolean;
    }
  ) {
    const existing = await prisma.expenseReport.findFirst({
      where: {
        ownerId: employee.id,
        title,
      },
    });

    if (existing) {
      console.log(`↻ Updating existing report: ${title}`);

      await prisma.expenseLine.deleteMany({
        where: {
          reportId: existing.id,
        },
      });

      await prisma.expenseReport.update({
        where: {
          id: existing.id,
        },
        data: {
          startDate,
          endDate,
          status,
          archived: options?.archived ?? false,
          submittedAt: options?.submittedAt ?? null,
          total: expenses.reduce((sum, item) => sum + item.amount, 0),
        },
      });

      for (const expense of expenses) {
        await prisma.expenseLine.create({
          data: {
            reportId: existing.id,
            expenseDate: expense.expenseDate,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
          },
        });
      }

      if (options?.assignApprover) {
        await prisma.reportApprover.upsert({
          where: {
            reportId_approverId: {
              reportId: existing.id,
              approverId: approver.id,
            },
          },
          update: {},
          create: {
            reportId: existing.id,
            approverId: approver.id,
          },
        });
      }

      return existing;
    }

    const total = expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const report = await prisma.expenseReport.create({
      data: {
        ownerId: employee.id,
        title,
        startDate,
        endDate,
        status,
        archived: options?.archived ?? false,
        submittedAt: options?.submittedAt ?? null,
        total,
        expenseLines: {
          create: expenses.map((expense) => ({
            expenseDate: expense.expenseDate,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
          })),
        },
      },
    });

    if (options?.assignApprover) {
      await prisma.reportApprover.create({
        data: {
          reportId: report.id,
          approverId: approver.id,
        },
      });
    }

    return report;
  }

  async function addHistory(
    reportId: string,
    oldStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID" | null,
    newStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID",
    actorId: string,
    reason?: string
  ) {
    const exists = await prisma.reportHistory.findFirst({
      where: {
        reportId,
        oldStatus,
        newStatus,
        actorId,
      },
    });

    if (!exists) {
      await prisma.reportHistory.create({
        data: {
          reportId,
          actorId,
          oldStatus,
          newStatus,
          reason: reason ?? null,
        },
      });
    }
  }

  async function addComment(
    reportId: string,
    authorId: string,
    comment: string
  ) {
    const exists = await prisma.comment.findFirst({
      where: {
        reportId,
        authorId,
        comment,
      },
    });

    if (!exists) {
      await prisma.comment.create({
        data: {
          reportId,
          authorId,
          comment,
        },
      });
    }
  }

  // ------------------------------------------------------------
  // 3. DRAFT REPORT
  // ------------------------------------------------------------

  const draftReport = await createReport(
    "September Office Supplies",
    "DRAFT",
    new Date("2026-09-01"),
    new Date("2026-09-05"),
    [
      {
        expenseDate: new Date("2026-09-02"),
        amount: 2500,
        category: "SUPPLIES",
        description: "Office stationery and printer supplies",
      },
    ]
  );

  console.log(`✓ Draft report: ${draftReport.title}`);

  // ------------------------------------------------------------
  // 4. SUBMITTED REPORT
  // ------------------------------------------------------------

  const submittedReport = await createReport(
    "September Client Meeting",
    "SUBMITTED",
    new Date("2026-09-01"),
    new Date("2026-09-07"),
    [
      {
        expenseDate: new Date("2026-09-03"),
        amount: 1800,
        category: "TRAVEL",
        description: "Taxi travel for client meeting",
      },
      {
        expenseDate: new Date("2026-09-03"),
        amount: 1200,
        category: "MEALS",
        description: "Client meeting lunch",
      },
    ],
    {
      submittedAt: new Date("2026-09-03T10:00:00Z"),
      assignApprover: true,
      history: true,
      comments: true,
    }
  );

  await addHistory(
    submittedReport.id,
    "DRAFT",
    "SUBMITTED",
    employee.id
  );

  await addComment(
    submittedReport.id,
    employee.id,
    "Submitted for approval."
  );

  console.log(`✓ Submitted report: ${submittedReport.title}`);

  // ------------------------------------------------------------
  // 5. APPROVED REPORT
  // ------------------------------------------------------------

  const approvedReport = await createReport(
    "August Business Expenses",
    "APPROVED",
    new Date("2026-08-01"),
    new Date("2026-08-31"),
    [
      {
        expenseDate: new Date("2026-08-12"),
        amount: 5000,
        category: "TRAVEL",
        description: "Inter-city travel for business meeting",
      },
      {
        expenseDate: new Date("2026-08-13"),
        amount: 3500,
        category: "HOTEL",
        description: "Business trip accommodation",
      },
    ],
    {
      submittedAt: new Date("2026-09-02T17:58:50Z"),
      assignApprover: true,
      history: true,
      comments: true,
    }
  );

  await addHistory(
    approvedReport.id,
    "DRAFT",
    "SUBMITTED",
    employee.id
  );

  await addHistory(
    approvedReport.id,
    "SUBMITTED",
    "APPROVED",
    approver.id
  );

  await addComment(
    approvedReport.id,
    approver.id,
    "Expenses reviewed and approved."
  );

  console.log(`✓ Approved report: ${approvedReport.title}`);

  // ------------------------------------------------------------
  // 6. PAID REPORT
  // ------------------------------------------------------------

  const paidReport = await createReport(
    "July Travel Reimbursement",
    "PAID",
    new Date("2026-07-01"),
    new Date("2026-07-31"),
    [
      {
        expenseDate: new Date("2026-07-10"),
        amount: 4200,
        category: "TRAVEL",
        description: "Train tickets for official travel",
      },
      {
        expenseDate: new Date("2026-07-11"),
        amount: 1800,
        category: "MEALS",
        description: "Meals during official travel",
      },
    ],
    {
      submittedAt: new Date("2026-07-15T10:00:00Z"),
      assignApprover: true,
      history: true,
    }
  );

  await addHistory(
    paidReport.id,
    "DRAFT",
    "SUBMITTED",
    employee.id
  );

  await addHistory(
    paidReport.id,
    "SUBMITTED",
    "APPROVED",
    approver.id
  );

  await addHistory(
    paidReport.id,
    "APPROVED",
    "PAID",
    approver.id
  );

  console.log(`✓ Paid report: ${paidReport.title}`);

  // ------------------------------------------------------------
  // 7. STALE SUBMITTED REPORT
  // ------------------------------------------------------------

  const staleSubmittedReport = await createReport(
    "June Pending Reimbursement",
    "SUBMITTED",
    new Date("2026-06-01"),
    new Date("2026-06-30"),
    [
      {
        expenseDate: new Date("2026-06-18"),
        amount: 3200,
        category: "TRAVEL",
        description: "Travel expense awaiting approval",
      },
      {
        expenseDate: new Date("2026-06-19"),
        amount: 800,
        category: "MEALS",
        description: "Meals during travel",
      },
    ],
    {
      // Deliberately old so it appears in stale alerts.
      submittedAt: new Date("2026-08-20T10:00:00Z"),
      assignApprover: true,
      history: true,
    }
  );

  await addHistory(
    staleSubmittedReport.id,
    "DRAFT",
    "SUBMITTED",
    employee.id
  );

  console.log(
    `✓ Stale submitted report: ${staleSubmittedReport.title}`
  );

  // ------------------------------------------------------------
  // 8. REJECTED-WORKFLOW DEMO
  // ------------------------------------------------------------

  const rejectedReport = await createReport(
    "May Reimbursement - Needs Correction",
    "DRAFT",
    new Date("2026-05-01"),
    new Date("2026-05-31"),
    [
      {
        expenseDate: new Date("2026-05-15"),
        amount: 1500,
        category: "OTHER",
        description: "Miscellaneous business expense",
      },
    ],
    {
      assignApprover: true,
      history: true,
      comments: true,
    }
  );

  await addHistory(
    rejectedReport.id,
    "SUBMITTED",
    "DRAFT",
    approver.id,
    "Please provide a clearer description and supporting details."
  );

  await addComment(
    rejectedReport.id,
    approver.id,
    "Please provide a clearer description and supporting details."
  );

  console.log(`✓ Rejected workflow report: ${rejectedReport.title}`);

  // ------------------------------------------------------------
  // 9. ARCHIVED REPORT
  // ------------------------------------------------------------

  const archivedReport = await createReport(
    "April Archived Expenses",
    "DRAFT",
    new Date("2026-04-01"),
    new Date("2026-04-30"),
    [
      {
        expenseDate: new Date("2026-04-12"),
        amount: 900,
        category: "SUPPLIES",
        description: "Archived office supplies expense",
      },
    ],
    {
      archived: true,
    }
  );

  console.log(`✓ Archived report: ${archivedReport.title}`);

  // ------------------------------------------------------------
  // 10. SUMMARY
  // ------------------------------------------------------------

  const reportCount = await prisma.expenseReport.count();
  const expenseCount = await prisma.expenseLine.count();
  const historyCount = await prisma.reportHistory.count();
  const commentCount = await prisma.comment.count();
  const assignmentCount = await prisma.reportApprover.count();

  console.log("");
  console.log("======================================");
  console.log("        SEED COMPLETED SUCCESSFULLY");
  console.log("======================================");
  console.log(`Users:        2`);
  console.log(`Reports:      ${reportCount}`);
  console.log(`Expenses:     ${expenseCount}`);
  console.log(`Assignments:  ${assignmentCount}`);
  console.log(`History:      ${historyCount}`);
  console.log(`Comments:     ${commentCount}`);
  console.log("");
  console.log("Demo credentials:");
  console.log("Employee: yahya@example.com / Password123");
  console.log("Approver: approver@example.com / Password123");
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });