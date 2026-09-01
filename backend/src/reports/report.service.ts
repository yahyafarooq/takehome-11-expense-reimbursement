import prisma from "../lib/prisma";
import { CreateReportInput } from "../validators/report.validator";

export async function createReport(
  ownerId: string,
  input: CreateReportInput
) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  if (endDate < startDate) {
    throw new Error("End date cannot be before start date");
  }

  const report = await prisma.expenseReport.create({
    data: {
      ownerId,
      title: input.title,
      startDate,
      endDate,
      status: "DRAFT",
    },
  });

  return report;
}

export async function submitReport(
  reportId: string,
  userId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.ownerId !== userId) {
    throw new Error("You do not have permission to submit this report");
  }

  if (report.status !== "DRAFT") {
    throw new Error("Only draft reports can be submitted");
  }

  const submittedAt = new Date();

  const updatedReport = await prisma.$transaction(async (tx) => {
    const updated = await tx.expenseReport.update({
      where: { id: reportId },
      data: {
        status: "SUBMITTED",
        submittedAt,
      },
    });

    await tx.reportHistory.create({
      data: {
        reportId,
        actorId: userId,
        oldStatus: "DRAFT",
        newStatus: "SUBMITTED",
        reason: "Report submitted by employee",
      },
    });

    return updated;
  });

  return updatedReport;
}