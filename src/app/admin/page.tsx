"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

type StatusHistoryEntry = {
  id: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  note: string | null;
  changedAt: string;
  changedBy: { name: string };
};

type Complaint = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  photoUrl: string | null;
  isOverdue: boolean;
  createdAt: string;
  raisedBy: { name: string; flatNumber: string | null; email: string };
  statusHistory: StatusHistoryEntry[];
  recurring: { isRecurring: boolean; count: number; relatedIds: string[] };
};

const CATEGORIES = ["PLUMBING", "ELECTRICAL", "CLEANING", "SECURITY", "PARKING", "LIFT", "OTHER"];
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-ink/5 text-ink/60",
  MEDIUM: "bg-orange-100 text-orange-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [fetching, setFetching] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [statusModal, setStatusModal] = useState<{ id: string; newStatus: string } | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const loadComplaints = useCallback(async () => {
    setFetching(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    const res = await fetch(`/api/complaints?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setComplaints(data.complaints || []);
    }
    setFetching(false);
  }, [categoryFilter, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (user?.role === "ADMIN") loadComplaints();
  }, [user, loadComplaints]);

  async function updatePriority(id: string, priority: string) {
    await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    loadComplaints();
  }

  function openStatusModal(id: string, newStatus: string) {
    setNoteText("");
    setStatusModal({ id, newStatus });
  }

  async function confirmStatusChange() {
    if (!statusModal) return;
    await fetch(`/api/complaints/${statusModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusModal.newStatus, note: noteText }),
    });
    setStatusModal(null);
    loadComplaints();
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 bg-cream">Loading...</div>;
  }

  const overdueComplaints = complaints.filter((c) => c.isOverdue);
  const otherComplaints = complaints.filter((c) => !c.isOverdue);

  function ComplaintRow({ c }: { c: Complaint }) {
    return (
      <div
        className={`bg-white border rounded-2xl p-4 ${
          c.isOverdue ? "border-red-300 ring-1 ring-red-100" : "border-ink/10"
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
  <h3 className="font-medium text-ink">{c.title}</h3>
  {c.isOverdue && (
    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      OVERDUE
    </span>
  )}
  {c.recurring.isRecurring && (
    <span
      className="text-xs font-semibold text-navy-900 bg-clay-100 px-2 py-0.5 rounded-full"
      title={`${c.recurring.count} ${c.category.toLowerCase()} complaints from this flat in the last 60 days`}
    >
      🔁 Recurring · {c.recurring.count}×
    </span>
  )}
</div>
            <p className="text-xs text-ink/40">
              {c.raisedBy.name} {c.raisedBy.flatNumber ? `· ${c.raisedBy.flatNumber}` : ""} ·{" "}
              {new Date(c.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[c.status]}`}>
            {c.status.replace("_", " ")}
          </span>
        </div>

        <p className="text-sm text-ink/70 mb-3">{c.description}</p>

        {c.photoUrl && (
            <Image src={c.photoUrl} alt="Complaint" width={112} height={112} className="w-28 h-28 object-cover rounded-lg mb-3 border border-ink/10" />
        )}

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div>
            <label className="text-xs text-ink/40 block mb-1">Priority</label>
            <select
              value={c.priority}
              onChange={(e) => updatePriority(c.id, e.target.value)}
              className={`text-xs font-medium px-2 py-1 rounded-lg border-0 ${PRIORITY_STYLES[c.priority]}`}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-ink/40 block mb-1">Update status</label>
            <select
              value=""
              onChange={(e) => e.target.value && openStatusModal(c.id, e.target.value)}
              disabled={c.status === "RESOLVED"}
              className="text-xs px-2 py-1 rounded-lg border border-ink/15 disabled:opacity-40"
            >
              <option value="">{c.status === "RESOLVED" ? "Closed" : "Change status..."}</option>
              {STATUSES.filter((s) => s !== c.status).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <details className="text-xs text-ink/50">
          <summary className="cursor-pointer font-medium text-ink/70">
            History ({c.statusHistory.length})
          </summary>
          <ul className="mt-2 space-y-1 border-l-2 border-ink/10 pl-3">
            {c.statusHistory.map((h) => (
              <li key={h.id}>
                <span className="font-medium">{h.status.replace("_", " ")}</span> by {h.changedBy.name} ·{" "}
                {new Date(h.changedAt).toLocaleString()}
                {h.note && <span className="block text-ink/40">"{h.note}"</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream page-enter">
      <header className="bg-white border-b border-ink/10 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-lg font-medium text-ink tracking-tight">nivas</span>
          <p className="text-xs text-ink/40">{user.name}</p>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/admin/dashboard" className="text-sm text-ink/50 hover:text-ink transition-colors">
            Dashboard
          </Link>
          <Link href="/notices" className="text-sm text-ink/50 hover:text-ink transition-colors">
            Notice Board
          </Link>
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="text-sm text-ink/50 hover:text-ink transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-ink/10 rounded-2xl p-4 mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-ink/40 block mb-1">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm border border-ink/15 rounded-lg px-2 py-1.5">
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink/40 block mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-ink/15 rounded-lg px-2 py-1.5">
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink/40 block mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm border border-ink/15 rounded-lg px-2 py-1.5" />
          </div>
          <div>
            <label className="text-xs text-ink/40 block mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm border border-ink/15 rounded-lg px-2 py-1.5" />
          </div>
          <button
            onClick={() => { setCategoryFilter(""); setStatusFilter(""); setFromDate(""); setToDate(""); }}
            className="text-sm text-ink/50 hover:text-ink px-2 py-1.5"
          >
            Clear
          </button>
        </div>

        {fetching ? (
          <p className="text-sm text-ink/40">Loading complaints...</p>
        ) : (
          <>
            {overdueComplaints.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-red-700 mb-3">
                  ⚠ Overdue ({overdueComplaints.length})
                </h2>
                <div className="space-y-3">
                  {overdueComplaints.map((c) => <ComplaintRow key={c.id} c={c} />)}
                </div>
              </div>
            )}

            <h2 className="text-sm font-semibold text-ink/70 mb-3">
              All Complaints ({otherComplaints.length})
            </h2>
            {otherComplaints.length === 0 ? (
              <p className="text-sm text-ink/40">No complaints match these filters.</p>
            ) : (
              <div className="space-y-3">
                {otherComplaints.map((c) => <ComplaintRow key={c.id} c={c} />)}
              </div>
            )}
          </>
        )}
      </main>

      {statusModal && (
        <div className="fixed inset-0 bg-ink/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-medium text-ink mb-1">
              Mark as {statusModal.newStatus.replace("_", " ")}
            </h3>
            <p className="text-xs text-ink/40 mb-4">Add an optional note for this change</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="e.g. Plumber scheduled for tomorrow"
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStatusModal(null)} className="text-sm px-3 py-1.5 text-ink/50 hover:text-ink">
                Cancel
              </button>
              <button onClick={confirmStatusChange} className="text-sm px-3 py-1.5 bg-clay-600 text-white rounded-full hover:bg-clay-700">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}