import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 page-enter relative overflow-hidden">
      <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-clay-600 opacity-[0.07]" />
      <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-3xl bg-navy-900 opacity-[0.05] rotate-12" />

      <div className="relative z-10 text-center max-w-lg">
        <span className="text-3xl font-medium text-ink tracking-tight">nivas</span>
        <p className="text-ink/60 mt-3 mb-10 text-[15px] leading-relaxed">
          Raise complaints, track every status change, and stay in the loop —
          built for residents and admins who need maintenance actually handled, not just logged.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="bg-clay-600 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-clay-700 active:scale-[0.99] transition-all"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-white border border-ink/15 text-ink text-sm font-medium px-6 py-2.5 rounded-full hover:bg-ink/[0.03] transition-all"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}