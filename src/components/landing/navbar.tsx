import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-black tracking-tight text-emerald-800"
        >
          SukiGo
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Login
          </Link>
          <Link
            href="/register/buyer"
            className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Start Buying
          </Link>
          <Link
            href="/register/seller"
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Start Selling
          </Link>
        </nav>
      </div>
    </header>
  );
}
