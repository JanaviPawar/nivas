import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { refreshOverdueStatuses } from "@/lib/overdue";

const ALL_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"];
const ALL_CATEGORIES = ["PLUMBING", "ELECTRICAL", "CLEANING", "SECURITY", "PARKING", "LIFT", "OTHER"];
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const TREND_DAYS = 30;

function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await refreshOverdueStatuses(auth.societyId);

  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - TREND_DAYS);

  const [
    statusGroups,
    categoryGroups,
    priorityGroups,
    overdueCount,
    totalComplaints,
    resolvedComplaints,
    recentComplaints,
    oldestOpen,
  ] = await Promise.all([
    prisma.complaint.groupBy({ by: ["status"], where: { societyId: auth.societyId }, _count: { status: true } }),
    prisma.complaint.groupBy({ by: ["category"], where: { societyId: auth.societyId }, _count: { category: true } }),
    prisma.complaint.groupBy({ by: ["priority"], where: { societyId: auth.societyId }, _count: { priority: true } }),
    prisma.complaint.count({ where: { societyId: auth.societyId, isOverdue: true } }),
    prisma.complaint.count({ where: { societyId: auth.societyId } }),
    prisma.complaint.findMany({
      where: { societyId: auth.societyId, status: "RESOLVED", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.complaint.findMany({
      where: { societyId: auth.societyId, createdAt: { gte: trendStart } },
      select: { createdAt: true },
    }),
    prisma.complaint.findMany({
      where: { societyId: auth.societyId, status: { not: "RESOLVED" } },
      select: {
        id: true, title: true, category: true, isOverdue: true, createdAt: true,
        raisedBy: { select: { flatNumber: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
  ]);

  const byStatus = ALL_STATUSES.map((status) => {
    const match = statusGroups.find((g) => g.status === status);
    return { status, count: match?._count.status || 0 };
  });

  const byCategory = ALL_CATEGORIES.map((category) => {
    const match = categoryGroups.find((g) => g.category === category);
    return { category, count: match?._count.category || 0 };
  });

  const byPriority = ALL_PRIORITIES.map((priority) => {
    const match = priorityGroups.find((g) => g.priority === priority);
    return { priority, count: match?._count.priority || 0 };
  });

  // Average resolution time, in days
  let avgResolutionDays: number | null = null;
  if (resolvedComplaints.length > 0) {
    const totalMs = resolvedComplaints.reduce((sum, c) => {
      return sum + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime());
    }, 0);
    avgResolutionDays = Math.round((totalMs / resolvedComplaints.length / (1000 * 60 * 60 * 24)) * 10) / 10;
  }

  // Trend: bucket by day for the last 30 days, filling in zero-days
  const trendMap = new Map<string, number>();
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const c of recentComplaints) {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + 1);
  }
  const trend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  const oldestOpenFormatted = oldestOpen.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    isOverdue: c.isOverdue,
    flatNumber: c.raisedBy.flatNumber,
    daysOpen: Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  return NextResponse.json({
    totalComplaints,
    overdueCount,
    byStatus,
    byCategory,
    byPriority,
    avgResolutionDays,
    trend,
    oldestOpen: oldestOpenFormatted,
  });
}