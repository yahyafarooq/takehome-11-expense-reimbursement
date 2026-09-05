import prisma from "../lib/prisma";

const STALE_DAYS = 3;
const RETURN_DAYS = 2;

export async function getAlerts(approverId: string) {
  const now = new Date();

  const staleThreshold = new Date(now);
  staleThreshold.setDate(staleThreshold.getDate() - STALE_DAYS);

  const returnThreshold = new Date(now);
  returnThreshold.setDate(
    returnThreshold.getDate() - RETURN_DAYS
  );

  const reports = await prisma.expenseReport.findMany({
    where: {
      status: "SUBMITTED",
      archived: false,
      submittedAt: {
        lte: staleThreshold,
      },
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
      approvers: {
        where: {
          approverId,
        },
        select: {
          approverId: true,
        },
      },
      alertDismissals: {
        where: {
          approverId,
        },
        select: {
          dismissedAt: true,
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });

  const alerts = reports.filter((report) => {
    const dismissal = report.alertDismissals[0];

    // Never dismissed → show alert
    if (!dismissal) {
      return true;
    }

    // Dismissed more than RETURN_DAYS ago → show again
    return dismissal.dismissedAt <= returnThreshold;
  });

  return alerts.map((report) => ({
    reportId: report.id,
    title: report.title,
    owner: report.owner,
    total: Number(report.total),
    submittedAt: report.submittedAt,
    staleDays: Math.floor(
      (now.getTime() -
        (report.submittedAt?.getTime() ?? now.getTime())) /
        (1000 * 60 * 60 * 24)
    ),
  }));
}

export async function dismissAlert(
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
    throw new Error(
      "Only submitted reports can have alerts dismissed"
    );
  }

  const assigned = report.approvers.some(
    (assignment) => assignment.approverId === approverId
  );

  if (!assigned) {
    throw new Error("You are not assigned to this report");
  }

  return prisma.alertDismissal.upsert({
    where: {
      reportId_approverId: {
        reportId,
        approverId,
      },
    },
    update: {
      dismissedAt: new Date(),
    },
    create: {
      reportId,
      approverId,
    },
  });
}