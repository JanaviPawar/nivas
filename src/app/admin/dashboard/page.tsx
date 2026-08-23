"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";


type StatusStat = { status: string; count: number };
type CategoryStat = { category: string; count: number };
type PriorityStat = { priority: string; count: number };
type TrendPoint = { date: string; count: number };
type OldestOpen = {
  id: string;
  title: string;
  category: string;
  isOverdue: boolean;
  flatNumber: string | null;
  daysOpen: number;
};

type Stats = {
  totalComplaints: number;
  overdueCount: number;
  byStatus: StatusStat[];
  byCategory: CategoryStat[];
  byPriority: PriorityStat[];
  avgResolutionDays: number | null;
  trend: TrendPoint[];
  oldestOpen: OldestOpen[];
};

const STATUS_COLORS: Record<string, string> = { OPEN: "#f59e0b", IN_PROGRESS: "#3b82f6", RESOLVED: "#22c55e" };
const PRIORITY_COLORS: Record<string, string> = { LOW: "#94a3b8", MEDIUM: "#f97316", HIGH: "#dc2626" };
const CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: "Plumbing", ELECTRICAL: "Electrical", CLEANING: "Cleaning",
  SECURITY: "Security", PARKING: "Parking", LIFT: "Lift", OTHER: "Other",
};

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => setStats(data))
        .finally(() => setFetching(false));
    }
  }, [user]);

  if (loading || !user || fetching || !stats) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 bg-cream">Loading...</div>;
  }

  const resolvedCount = stats.byStatus.find((s) => s.status === "RESOLVED")?.count || 0;
  const openCount = stats.byStatus.find((s) => s.status === "OPEN")?.count || 0;
  const inProgressCount = stats.byStatus.find((s) => s.status === "IN_PROGRESS")?.count || 0;
  const resolutionRate = stats.totalComplaints > 0 ? Math.round((resolvedCount / stats.totalComplaints) * 100) : 0;

  const activeCategories = stats.byCategory
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ ...c, label: CATEGORY_LABELS[c.category] || c.category }));
  const maxCategoryCount = Math.max(...activeCategories.map((c) => c.count), 1);
  const maxPriorityCount = Math.max(...stats.byPriority.map((p) => p.count), 1);

  const cards = [
  { label: "Total Complaints", value: stats.totalComplaints, accent: "#0f172a", bg: "bg-ink/[0.03]" },
  { label: "Open", value: openCount, accent: "#f59e0b", bg: "bg-amber-50" },
  { label: "In Progress", value: inProgressCount, accent: "#3b82f6", bg: "bg-blue-50" },
  { label: "Resolved", value: resolvedCount, accent: "#22c55e", bg: "bg-green-50" },
  { label: "Overdue", value: stats.overdueCount, accent: "#c1633d", bg: "bg-clay-50" },
];

  return (
    <div className="min-h-screen bg-cream page-enter">
      <header className="bg-white/80 backdrop-blur border-b border-ink/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="text-lg font-medium text-ink tracking-tight">nivas</span>
          <p className="text-xs text-ink/40">Reporting Dashboard</p>
        </div>
        <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors">
  ← Back to Complaints
</Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className={`relative overflow-hidden rounded-2xl border border-ink/10 ${c.bg} p-5 transition-transform hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: c.accent }} />
              
              <p className="text-3xl font-semibold text-ink tracking-tight">{c.value}</p>
              <p className="text-xs text-ink/50 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Resolution rate + avg resolution time */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-ink/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-ink/70">Resolution Rate</h2>
              <span className="text-sm font-semibold text-ink">{resolutionRate}%</span>
            </div>
            <div className="h-2.5 w-full bg-ink/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-clay-400 to-clay-600 transition-all duration-700" style={{ width: `${resolutionRate}%` }} />
            </div>
            <p className="text-xs text-ink/40 mt-2">{resolvedCount} of {stats.totalComplaints} complaints resolved</p>
          </div>

          <div className="bg-white border border-ink/10 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-navy-900/5 p-3 rounded-xl">
                <span className="text-xl">⏱️</span>
            </div>
            <div>
              <p className="text-2xl font-semibold text-ink">
                {stats.avgResolutionDays !== null ? `${stats.avgResolutionDays}d` : "—"}
              </p>
              <p className="text-xs text-ink/50">Average time to resolve</p>
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-white border border-ink/10 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-ink/70 mb-4">Complaints Raised — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.trend}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c1633d" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#c1633d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1ede7" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                interval={4}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
              <Tooltip
                labelFormatter={(v: any) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
              <Area type="monotone" dataKey="count" stroke="#c1633d" strokeWidth={2} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut + Category bars + Priority bars */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="md:col-span-2 bg-white border border-ink/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-ink/70 mb-4">By Status</h2>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.byStatus} dataKey="count" nameKey="status" innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none">
                    {stats.byStatus.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [value, String(name).replace("_", " ")]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-semibold text-ink">{stats.totalComplaints}</p>
                <p className="text-xs text-ink/40">total</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-2 flex-wrap">
              {stats.byStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                  <span className="text-xs text-ink/50">{s.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 bg-white border border-ink/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-ink/70 mb-4">By Category</h2>
            {activeCategories.length === 0 ? (
              <p className="text-sm text-ink/40 py-8 text-center">No complaints yet</p>
            ) : (
              <div className="space-y-3">
                {activeCategories.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink/70 font-medium">{c.label}</span>
                      <span className="text-ink/40">{c.count}</span>
                    </div>
                    <div className="h-2 w-full bg-ink/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-navy-800 to-navy-900 transition-all duration-700" style={{ width: `${(c.count / maxCategoryCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Priority breakdown + Oldest open */}
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-2 bg-white border border-ink/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-ink/70 mb-4">By Priority</h2>
            <div className="space-y-3">
              {stats.byPriority.map((p) => (
                <div key={p.priority}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink/70 font-medium">{p.priority}</span>
                    <span className="text-ink/40">{p.count}</span>
                  </div>
                  <div className="h-2 w-full bg-ink/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(p.count / maxPriorityCount) * 100}%`, backgroundColor: PRIORITY_COLORS[p.priority] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 bg-white border border-ink/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-ink/70 mb-4">Longest-Waiting Open Complaints</h2>
            {stats.oldestOpen.length === 0 ? (
              <p className="text-sm text-ink/40 py-8 text-center">Nothing currently open — nice work.</p>
            ) : (
              <div className="space-y-2">
                {stats.oldestOpen.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-ink/5 last:border-0">
                    <div>
                      <p className="text-sm text-ink font-medium">{c.title}</p>
                      <p className="text-xs text-ink/40">
                        {c.flatNumber || "Unknown flat"} · {CATEGORY_LABELS[c.category] || c.category}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${c.isOverdue ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink/60"}`}>
                      {c.daysOpen}d open
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}