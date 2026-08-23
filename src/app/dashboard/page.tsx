"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type StatusHistoryEntry = {
  id: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  note: string | null;
  changedAt: string;
  changedBy: { name: string; role: string };
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
  statusHistory: StatusHistoryEntry[];
};

type Notice = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

const CATEGORIES = [
  { value: "PLUMBING", label: "Plumbing" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "SECURITY", label: "Security" },
  { value: "PARKING", label: "Parking" },
  { value: "LIFT", label: "Lift" },
  { value: "OTHER", label: "Other" },
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
};

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [importantNotices, setImportantNotices] = useState<Notice[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState("PLUMBING");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  async function loadComplaints() {
    setFetching(true);
    const res = await fetch("/api/complaints");
    if (res.ok) {
      const data = await res.json();
      setComplaints(data.complaints || []);
    }
    setFetching(false);
  }

  async function loadImportantNotices() {
    const res = await fetch("/api/notices");
    if (res.ok) {
      const data = await res.json();
      const important = (data.notices || []).filter((n: any) => n.isImportant).slice(0, 3);
      setImportantNotices(important);
    }
  }

  useEffect(() => {
    if (user) {
      loadComplaints();
      loadImportantNotices();
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (description.trim().length < 5) {
      setError("Please add a bit more detail to your description");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("category", category);
    formData.append("description", description);
    if (photo) formData.append("photo", photo);

    const res = await fetch("/api/complaints", { method: "POST", body: formData });
    let data: any = {};
    try { data = await res.json(); } catch {}
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setDescription("");
    setPhoto(null);
    setShowForm(false);
    loadComplaints();
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 bg-cream">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-cream page-enter">
      <header className="bg-white border-b border-ink/10 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-lg font-medium text-ink tracking-tight">nivas</span>
          <p className="text-xs text-ink/40">
            {user.name} {user.flatNumber ? `· ${user.flatNumber}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-5">
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

      <main className="max-w-3xl mx-auto px-6 py-8">
        {importantNotices.length > 0 && (
          <div className="mb-6 space-y-2">
            {importantNotices.map((n) => (
              <div key={n.id} className="bg-clay-50 border border-clay-100 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-clay-600 mt-0.5">📌</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-clay-700">{n.title}</p>
                  <p className="text-xs text-clay-600/80">{n.content}</p>
                </div>
                <Link href="/notices" className="text-xs text-clay-600 underline whitespace-nowrap">
                  View all
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-ink">My Complaints</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-clay-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-clay-700 active:scale-[0.99] transition-all"
          >
            {showForm ? "Cancel" : "+ Raise Complaint"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-2xl p-6 mb-8 space-y-4">
            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the issue..."
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500"
              />
            </div>

            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm text-ink/70"
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-clay-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-clay-700 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </form>
        )}

        {fetching ? (
          <p className="text-sm text-ink/40">Loading complaints...</p>
        ) : complaints.length === 0 ? (
          <div className="bg-white border border-ink/10 rounded-2xl p-10 text-center">
            <p className="text-sm text-ink/40">You haven't raised any complaints yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white border border-ink/10 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-ink">{c.title}</h3>
                    <p className="text-xs text-ink/40">{new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-ink/70 mb-3">{c.description}</p>
                {c.photoUrl && (
                    <Image
                        src={c.photoUrl}
                        alt="Complaint"
                        width={128}
                        height={128}
                        className="w-32 h-32 object-cover rounded-lg mb-3 border border-ink/10"
                    />
                )}
                <details className="text-xs text-ink/50">
                  <summary className="cursor-pointer font-medium text-ink/70">
                    Status history ({c.statusHistory.length})
                  </summary>
                  <ul className="mt-2 space-y-1 border-l-2 border-ink/10 pl-3">
                    {c.statusHistory.map((h) => (
                      <li key={h.id}>
                        <span className="font-medium">{h.status.replace("_", " ")}</span> by {h.changedBy.name} on{" "}
                        {new Date(h.changedAt).toLocaleString()}
                        {h.note && <span className="block text-ink/40">"{h.note}"</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}