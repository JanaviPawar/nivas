"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    await refreshUser();
    router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex page-enter">
      {/* Left: navy panel with soft shapes + notice preview */}
      <div className="hidden lg:flex lg:w-[45%] bg-navy-900 relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-clay-600 opacity-10" />
        <div className="absolute bottom-10 -left-20 w-56 h-56 rounded-3xl bg-clay-500 opacity-10 rotate-12" />

        <span className="relative z-10 text-white text-xl font-medium tracking-tight">nivas</span>

        <div className="relative z-10 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Notice board</p>
          <div className="bg-clay-600 rounded-xl px-4 py-3 flex items-start gap-2 shadow-lg shadow-black/20">
            <span className="text-white text-sm mt-0.5">📌</span>
            <div>
              <p className="text-white text-sm font-medium">Water supply maintenance</p>
              <p className="text-white/70 text-xs">Shut off 10am–2pm tomorrow</p>
            </div>
          </div>
          <div className="bg-navy-800 rounded-xl px-4 py-3">
            <p className="text-white/80 text-sm font-medium">Lift servicing completed</p>
            <p className="text-white/40 text-xs">Block B, both lifts operational</p>
          </div>
          <div className="bg-navy-800 rounded-xl px-4 py-3 opacity-60">
            <p className="text-white/80 text-sm font-medium">Diwali decoration meeting</p>
            <p className="text-white/40 text-xs">Sat 6pm, clubhouse</p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">Society maintenance, handled properly.</p>
      </div>

      {/* Right: form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-medium text-ink tracking-tight">nivas</span>
          </div>

          <h1 className="text-xl font-medium text-ink mb-1">Log in</h1>
          <p className="text-sm text-ink/50 mb-7">Enter your details to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-clay-600 text-white py-2.5 rounded-full text-sm font-medium hover:bg-clay-700 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="text-sm text-ink/50 text-center mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-clay-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}