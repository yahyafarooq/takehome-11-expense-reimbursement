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