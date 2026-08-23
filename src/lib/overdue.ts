import { prisma } from "@/lib/prisma";
const lastChecked = new Map<string, number>();
const CHECK_INTERVAL_MS = 60_000;

// Marks complaints overdue/not-overdue based on the society's configurable threshold.
// Runs both from the daily cron job AND live whenever an admin opens their panel,
// so the flag is never more than a few seconds stale.
export async function refreshOverdueStatuses(societyId: string) {
  const now = Date.now();
  const last = lastChecked.get(societyId) || 0;
  if (now - last < CHECK_INTERVAL_MS) {
    return; // recently checked, skip the extra DB writes
  }
  lastChecked.set(societyId, now);

  const society = await prisma.society.findUnique({ where: { id: societyId } });
  if (!society) return;

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - society.overdueDays);

  // Flag newly-overdue complaints
  await prisma.complaint.updateMany({
    where: {
      societyId,
      status: { not: "RESOLVED" },
      createdAt: { lt: threshold },
      isOverdue: false,
    },
    data: { isOverdue: true },
  });

  // Un-flag any that no longer qualify (e.g. admin raised the threshold)
  await prisma.complaint.updateMany({
    where: {
      societyId,
      status: { not: "RESOLVED" },
      createdAt: { gte: threshold },
      isOverdue: true,
    },
    data: { isOverdue: false },
  });
}