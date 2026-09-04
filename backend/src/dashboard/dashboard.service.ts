import prisma from "../lib/prisma";

export async function getDashboard() {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLast8Weeks = new Date(startOfWeek);
  startOfLast8Weeks.setDate(startOfLast8Weeks.getDate() - 7 * 7);

  const [
    awaitingApproval,
    reimbursementsDue,
    approvedThisWeek,
    paidThisWeek,
    statusBreakdown,
    categoryBreakdown,
    paidReports,
  ] = await Promise.all([
    prisma.expenseReport.count({
      where: {
        status: "SUBMITTED",
        archived: false,
      },
    }),

    prisma.expenseReport.aggregate({
      where: {
        status: "APPROVED",
        archived: false,
      },
      _sum: {
        total: true,
      },
    }),

    prisma.expenseReport.aggregate({
      where: {
        status: "APPROVED",
        archived: false,
        updatedAt: {
          gte: startOfWeek,
        },
      },
      _sum: {
        total: true,
      },
    }),

    prisma.expenseReport.aggregate({
      where: {
        status: "PAID",
        archived: false,
        updatedAt: {
          gte: startOfWeek,
        },
      },
      _sum: {
        total: true,
      },
    }),

    prisma.expenseReport.groupBy({
      by: ["status"],
      where: {
        archived: false,
      },
      _count: {
        _all: true,
      },
      _sum: {
        total: true,
      },
    }),

    prisma.expenseLine.groupBy({
      by: ["category"],
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.expenseReport.findMany({
      where: {
        status: "PAID",
        archived: false,
        updatedAt: {
          gte: startOfLast8Weeks,
        },
      },
      select: {
        total: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "asc",
      },
    }),
  ]);

  const weeklyPaid = Array.from({ length: 8 }, (_, index) => {
    const weekStart = new Date(startOfLast8Weeks);
    weekStart.setDate(weekStart.getDate() + index * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const total = paidReports
      .filter(
        (report) =>
          report.updatedAt >= weekStart &&
          report.updatedAt < weekEnd
      )
      .reduce((sum, report) => sum + Number(report.total), 0);

    return {
      weekStart: weekStart.toISOString(),
      total,
    };
  });

  return {
    summary: {
      awaitingApproval,
      reimbursementsDue: Number(
        reimbursementsDue._sum.total ?? 0
      ),
      approvedThisWeek: Number(
        approvedThisWeek._sum.total ?? 0
      ),
      paidThisWeek: Number(
        paidThisWeek._sum.total ?? 0
      ),
    },

    statusBreakdown: statusBreakdown.map((item) => ({
      status: item.status,
      count: item._count._all,
      total: Number(item._sum.total ?? 0),
    })),

    categoryBreakdown: categoryBreakdown.map((item) => ({
      category: item.category,
      count: item._count._all,
      total: Number(item._sum.amount ?? 0),
    })),

    paidPerWeek: weeklyPaid,
  };
}