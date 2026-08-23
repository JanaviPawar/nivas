"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Society = { id: string; name: string };

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [role, setRole] = useState<"RESIDENT" | "ADMIN">("RESIDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [societyName, setSocietyName] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [societies, setSocieties] = useState<Society[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/societies")
      .then((res) => res.json())
      .then((data) => setSocieties(data.societies || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        flatNumber: role === "RESIDENT" ? flatNumber : undefined,
        societyName: role === "ADMIN" ? societyName : undefined,
        societyId: role === "RESIDENT" ? societyId : undefined,
        adminCode: role === "ADMIN" ? adminCode : undefined,
}       ),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    await refreshUser();
    router.push(role === "ADMIN" ? "/admin" : "/dashboard");
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

        <p className="relative z-10 text-xs text-white/30">Set up your society's maintenance desk.</p>
      </div>

      {/* Right: form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center bg-cream px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-6">
            <span className="text-2xl font-medium text-ink tracking-tight">nivas</span>
          </div>

          <h1 className="text-xl font-medium text-ink mb-1">Create your account</h1>
          <p className="text-sm text-ink/50 mb-6">Takes under a minute</p>

          <div className="flex gap-1 mb-6 bg-ink/[0.04] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setRole("RESIDENT")}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                role === "RESIDENT" ? "bg-white shadow-sm text-ink" : "text-ink/40"
              }`}
            >
              Resident
            </button>
            <button
              type="button"
              onClick={() => setRole("ADMIN")}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                role === "ADMIN" ? "bg-white shadow-sm text-ink" : "text-ink/40"
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm text-ink/70 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
              />
            </div>

            {role === "RESIDENT" && (
              <>
                <div>
                  <label className="block text-sm text-ink/70 mb-1.5">Flat number</label>
                  <input
                    type="text"
                    placeholder="e.g. A-204"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink/70 mb-1.5">Your society</label>
                  <select
                    required
                    value={societyId}
                    onChange={(e) => setSocietyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500"
                  >
                    <option value="">Select a society</option>
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {role === "ADMIN" && (
  <>
    <div>
      <label className="block text-sm text-ink/70 mb-1.5">Society name</label>
      <input
        type="text"
        required
        placeholder="e.g. Green Valley Society"
        value={societyName}
        onChange={(e) => setSocietyName(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
      />
      <p className="text-xs text-ink/40 mt-1.5">This creates a new society you'll manage</p>
    </div>
    <div>
      <label className="block text-sm text-ink/70 mb-1.5">Admin signup code</label>
      <input
        type="password"
        required
        value={adminCode}
        onChange={(e) => setAdminCode(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-ink/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-transparent transition-shadow"
      />
      <p className="text-xs text-ink/40 mt-1.5">Provided by whoever manages this Nivas deployment</p>
    </div>
    </>
    )}

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-clay-600 text-white py-2.5 rounded-full text-sm font-medium hover:bg-clay-700 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-sm text-ink/50 text-center mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-clay-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}