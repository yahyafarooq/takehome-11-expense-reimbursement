import prisma from "../lib/prisma";
import { CreateExpenseLineInput } from "../validators/expense.validator";

export async function createExpenseLine(
  reportId: string,
  input: CreateExpenseLineInput
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "DRAFT") {
    throw new Error("Expenses can only be added to a draft report");
  }

  const expense = await prisma.expenseLine.create({
    data: {
      reportId,
      expenseDate: new Date(input.expenseDate),
      amount: input.amount,
      category: input.category,
      description: input.description,
    },
  });

  const total = await prisma.expenseLine.aggregate({
    where: { reportId },
    _sum: {
      amount: true,
    },
  });

  await prisma.expenseReport.update({
    where: { id: reportId },
    data: {
      total: total._sum.amount ?? 0,
    },
  });

  return expense;
}

export async function updateExpenseLine(
  reportId: string,
  expenseId: string,
  userId: string,
  input: {
    expenseDate: string;
    amount: number;
    category: "TRAVEL" | "MEALS" | "HOTEL" | "SUPPLIES" | "OTHER";
    description: string;
  }
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error("Expense report not found");
  if (report.ownerId !== userId) throw new Error("You do not have permission");
  if (report.status !== "DRAFT") {
    throw new Error("Only draft reports can be edited");
  }

  const expense = await prisma.expenseLine.findFirst({
    where: { id: expenseId, reportId },
  });

  if (!expense) throw new Error("Expense line not found");

  const updated = await prisma.expenseLine.update({
    where: { id: expenseId },
    data: {
      expenseDate: new Date(input.expenseDate),
      amount: input.amount,
      category: input.category,
      description: input.description,
    },
  });

  const aggregate = await prisma.expenseLine.aggregate({
    where: { reportId },
    _sum: { amount: true },
  });

  await prisma.expenseReport.update({
    where: { id: reportId },
    data: { total: aggregate._sum.amount ?? 0 },
  });

  return updated;
}

export async function deleteExpenseLine(
  reportId: string,
  expenseId: string,
  userId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error("Expense report not found");
  if (report.ownerId !== userId) throw new Error("You do not have permission");
  if (report.status !== "DRAFT") {
    throw new Error("Only draft reports can be edited");
  }

  const expense = await prisma.expenseLine.findFirst({
    where: { id: expenseId, reportId },
  });

  if (!expense) throw new Error("Expense line not found");

  await prisma.expenseLine.delete({
    where: { id: expenseId },
  });

  const aggregate = await prisma.expenseLine.aggregate({
    where: { reportId },
    _sum: { amount: true },
  });

  return prisma.expenseReport.update({
    where: { id: reportId },
    data: { total: aggregate._sum.amount ?? 0 },
  });
}