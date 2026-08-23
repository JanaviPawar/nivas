"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Notice = {
  id: string;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  postedBy: { name: string };
};

export default function NoticesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  async function loadNotices() {
    setFetching(true);
    const res = await fetch("/api/notices");
    if (res.ok) {
      const data = await res.json();
      setNotices(data.notices || []);
    }
    setFetching(false);
  }

  useEffect(() => {
    if (user) loadNotices();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (title.trim().length < 2 || content.trim().length < 2) {
      setError("Please fill in both title and content");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, isImportant }),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setTitle("");
    setContent("");
    setIsImportant(false);
    setShowForm(false);
    loadNotices();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this notice?")) return;
    await fetch(`/api/notices/${id}`, { method: "DELETE" });
    loadNotices();
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 bg-cream">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-cream page-enter">
      <header className="bg-white border-b border-ink/10 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-lg font-medium text-ink tracking-tight">nivas</span>
          <p className="text-xs text-ink/40">Notice Board</p>
        </div>
        <Link
          href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
          className="text-sm text-ink/50 hover:text-ink transition-colors"
        >
          ← Back
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {user.role === "ADMIN" && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-ink">All Notices</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-clay-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-clay-700 active:scale-[0.99] transition-all"
            >
              {showForm ? "Cancel" : "+ Post Notice"}
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-2xl p-6 mb-8 space-y-4">
            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500"
              />
            </div>
            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="accent-clay-600"
              />
              Mark as important (pins to top + emails residents)
            </label>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-clay-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-clay-700 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Notice"}
            </button>
          </form>
        )}

        {fetching ? (
          <p className="text-sm text-ink/40">Loading notices...</p>
        ) : notices.length === 0 ? (
          <div className="bg-white border border-ink/10 rounded-2xl p-10 text-center">
            <p className="text-sm text-ink/40">No notices yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl p-5 border ${
                  n.isImportant ? "bg-clay-50 border-clay-100" : "bg-white border-ink/10"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {n.isImportant && <span className="text-clay-600 text-sm">📌</span>}
                    <h3 className="font-medium text-ink">{n.title}</h3>
                  </div>
                  {user.role === "ADMIN" && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-xs text-ink/30 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-sm text-ink/70 mb-2 whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-ink/40">
                  {n.postedBy.name} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}