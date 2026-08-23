import { prisma } from "@/lib/prisma";

const RECURRING_WINDOW_DAYS = 60;

export type RecurringInfo = {
  isRecurring: boolean;
  count: number; // total complaints in this pattern, including the current one
  relatedIds: string[];
};

// Flags a complaint as part of a recurring pattern if the same flat has raised
// 2+ complaints in the same category within the trailing window. This directly
// answers the brief's call-out that admins have "no way to see which issues
// keep coming back" — something the spec implies but doesn't explicitly require.
export async function getRecurringInfo(complaintId: string): Promise<RecurringInfo> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { raisedBy: { select: { flatNumber: true } } },
  });

  if (!complaint || !complaint.raisedBy.flatNumber) {
    return { isRecurring: false, count: 1, relatedIds: [] };
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - RECURRING_WINDOW_DAYS);

  const related = await prisma.complaint.findMany({
    where: {
      societyId: complaint.societyId,
      category: complaint.category,
      createdAt: { gte: windowStart },
      raisedBy: { flatNumber: complaint.raisedBy.flatNumber },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    isRecurring: related.length >= 2,
    count: related.length,
    relatedIds: related.map((r) => r.id),
  };
}

// Batch version for the admin list view, so we don't run N queries for N complaints.
export async function getRecurringMap(societyId: string): Promise<Map<string, RecurringInfo>> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - RECURRING_WINDOW_DAYS);

  const recentComplaints = await prisma.complaint.findMany({
    where: { societyId, createdAt: { gte: windowStart } },
    select: {
      id: true,
      category: true,
      createdAt: true,
      raisedBy: { select: { flatNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by flatNumber + category
  const groups = new Map<string, { id: string }[]>();
  for (const c of recentComplaints) {
    const flat = c.raisedBy.flatNumber;
    if (!flat) continue;
    const key = `${flat}::${c.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id: c.id });
  }

  const result = new Map<string, RecurringInfo>();
  for (const group of groups.values()) {
    const isRecurring = group.length >= 2;
    const relatedIds = group.map((g) => g.id);
    for (const item of group) {
      result.set(item.id, { isRecurring, count: group.length, relatedIds });
    }
  }

  return result;
}