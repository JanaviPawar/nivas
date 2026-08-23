import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 page-enter relative overflow-hidden">
      <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-clay-600 opacity-[0.07]" />

      <div className="relative z-10 text-center max-w-sm">
        <span className="text-lg font-medium text-ink/40 tracking-tight block mb-6">nivas</span>
        <p className="text-5xl font-semibold text-ink mb-3">404</p>
        <p className="text-ink/60 text-sm mb-8">This page doesn't exist, or you don't have access to it.</p>
        <Link
          href="/"
          className="bg-clay-600 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-clay-700 active:scale-[0.99] transition-all"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}