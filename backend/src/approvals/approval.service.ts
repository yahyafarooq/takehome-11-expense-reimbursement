import prisma from "../lib/prisma";

export async function getSubmittedReports() {
  return prisma.expenseReport.findMany({
    where: {
      status: "SUBMITTED",
      archived: false,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      expenseLines: true,
      approvers: true,
    },
    orderBy: {
      submittedAt: "asc",
    },
  });
}

export async function assignApprover(
  reportId: string,
  approverId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "SUBMITTED") {
    throw new Error("Only submitted reports can be assigned");
  }

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  if (!approver || approver.role !== "APPROVER") {
    throw new Error("Invalid approver");
  }

  return prisma.reportApprover.create({
    data: {
      reportId,
      approverId,
    },
  });
}

export async function approveReport(
  reportId: string,
  approverId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
    include: {
      approvers: true,
    },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "SUBMITTED") {
    throw new Error("Only submitted reports can be approved");
  }

  const assigned = report.approvers.some(
    (assignment) => assignment.approverId === approverId
  );

  if (!assigned) {
    throw new Error("You are not assigned to this report");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expenseReport.update({
      where: { id: reportId },
      data: {
        status: "APPROVED",
      },
    });

    await tx.reportHistory.create({
      data: {
        reportId,
        actorId: approverId,
        oldStatus: "SUBMITTED",
        newStatus: "APPROVED",
        reason: "Report approved by approver",
      },
    });

    return updated;
  });
}

export async function rejectReport(
  reportId: string,
  approverId: string,
  reason: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
    include: {
      approvers: true,
    },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "SUBMITTED") {
    throw new Error("Only submitted reports can be rejected");
  }

  const assigned = report.approvers.some(
    (assignment) => assignment.approverId === approverId
  );

  if (!assigned) {
    throw new Error("You are not assigned to this report");
  }

  if (!reason.trim()) {
    throw new Error("Rejection reason is required");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expenseReport.update({
      where: { id: reportId },
      data: {
        status: "DRAFT",
      },
    });

    await tx.reportHistory.create({
      data: {
        reportId,
        actorId: approverId,
        oldStatus: "SUBMITTED",
        newStatus: "DRAFT",
        reason: `Report rejected: ${reason}`,
      },
    });

    return updated;
  });
}