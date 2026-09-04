import prisma from "../lib/prisma";

export interface ReportSearchOptions {
  search?: string;
  status?: "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID";
  ownerId?: string;
  approverId?: string;
  sortBy?: "submittedAt" | "status" | "total";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

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

  if (report.ownerId === approverId) {
  throw new Error("You cannot approve or reject your own report");
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

export async function markReportAsPaid(
  reportId: string,
  approverId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "APPROVED") {
    throw new Error("Only approved reports can be marked as paid");
  }

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  if (!approver || approver.role !== "APPROVER") {
    throw new Error("Only approvers can mark reports as paid");
  }

  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.expenseReport.update({
      where: { id: reportId },
      data: {
        status: "PAID",
      },
    });

    await tx.reportHistory.create({
      data: {
        reportId,
        oldStatus: "APPROVED",
        newStatus: "PAID",
        actorId: approverId,
      },
    });

    return updatedReport;
  });
}

export async function getAssignedSubmittedReports(approverId: string) {
  return prisma.expenseReport.findMany({
    where: {
      status: "SUBMITTED",
      archived: false,
      approvers: {
        some: {
          approverId,
        },
      },
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
      approvers: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });
}

export async function searchReports(options: ReportSearchOptions) {
  const {
    search,
    status,
    ownerId,
    approverId,
    sortBy = "submittedAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 10,
  } = options;

  const where: any = {
    archived: false,
  };

  if (search) {
    where.title = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (status) {
    where.status = status;
  }

  if (ownerId) {
    where.ownerId = ownerId;
  }

  if (approverId) {
    where.approvers = {
      some: {
        approverId,
      },
    };
  }

  const skip = (page - 1) * pageSize;

  const orderBy: any = {
    [sortBy]: sortOrder,
  };

  const [reports, total] = await prisma.$transaction([
    prisma.expenseReport.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        expenseLines: true,
        approvers: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.expenseReport.count({ where }),
  ]);

  return {
    reports,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function bulkUpdateReports(
  reportIds: string[],
  approverId: string,
  action: "APPROVE" | "REJECT",
  reason?: string
) {
  const results = [];

  for (const reportId of reportIds) {
    try {
      if (action === "APPROVE") {
        const report = await approveReport(reportId, approverId);

        results.push({
          reportId,
          success: true,
          status: "APPROVED",
          report,
        });
      } else {
        if (!reason || !reason.trim()) {
          throw new Error("Rejection reason is required");
        }

        const report = await rejectReport(
          reportId,
          approverId,
          reason
        );

        results.push({
          reportId,
          success: true,
          status: "DRAFT",
          report,
        });
      }
    } catch (error) {
      results.push({
        reportId,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update report",
      });
    }
  }

  return results;
}

export async function getApprovedReportsForPayment() {
  return prisma.expenseReport.findMany({
    where: {
      status: "APPROVED",
      archived: false,
    },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });
}