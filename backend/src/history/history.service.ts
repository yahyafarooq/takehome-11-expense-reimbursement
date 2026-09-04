import prisma from "../lib/prisma";

export async function getReportHistory(
  reportId: string,
  user: { userId: string; role: "EMPLOYEE" | "APPROVER" }
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (user.role === "EMPLOYEE" && report.ownerId !== user.userId) {
    throw new Error("You do not have permission to view history for this report");
  }

  if (user.role === "APPROVER" && report.status === "DRAFT" && report.ownerId !== user.userId) {
    throw new Error("You do not have permission to view history for this report");
  }

  return prisma.reportHistory.findMany({
    where: { reportId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getReportComments(
  reportId: string,
  user: { userId: string; role: "EMPLOYEE" | "APPROVER" }
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (user.role === "EMPLOYEE" && report.ownerId !== user.userId) {
    throw new Error("You do not have permission to view comments for this report");
  }

  if (user.role === "APPROVER" && report.status === "DRAFT" && report.ownerId !== user.userId) {
    throw new Error("You do not have permission to view comments for this report");
  }

  return prisma.comment.findMany({
    where: { reportId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function addReportComment(
  reportId: string,
  authorId: string,
  comment: string
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

  const author = await prisma.user.findUnique({
    where: { id: authorId },
  });

  if (!author) {
    throw new Error("User not found");
  }

  const isOwner = report.ownerId === authorId;

  const isAssignedApprover = report.approvers.some(
    (assignment) => assignment.approverId === authorId
  );

  if (!isOwner && !isAssignedApprover) {
    throw new Error(
      "You do not have permission to comment on this report"
    );
  }

  if (!comment.trim()) {
    throw new Error("Comment cannot be empty");
  }

  return prisma.comment.create({
    data: {
      reportId,
      authorId,
      comment: comment.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}