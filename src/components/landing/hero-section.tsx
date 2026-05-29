import Link from "next/link";

interface HeroSectionProps {
  badgeText?: string;
  title?: string;
  subtitle?: string;
  startBuyingLabel?: string;
  startSellingLabel?: string;
  buyerAppTitle?: string;
  buyerAppDescription?: string;
  sellerAppTitle?: string;
  sellerAppDescription?: string;
  statsTitle?: string;
  statsSummary?: string;
}

export function HeroSection({
  badgeText = "Fresh Market Online",
  title = "Ang Palengke, naa na sa imong phone.",
  subtitle = "Palit ug fresh gulay, karne, ug seafood - or baligya imong produkto online.",
  startBuyingLabel = "Start Buying",
  startSellingLabel = "Start Selling",
  buyerAppTitle = "Buyer App",
  buyerAppDescription = "Product list, cart, and delivery tracking in one flow.",
  sellerAppTitle = "Seller App",
  sellerAppDescription = "POS + online orders for your palengke store.",
  statsTitle = "Today in your area",
  statsSummary = "128 active buyers, 34 active sellers, 19 riders online",
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,rgba(16,185,129,0.2),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.2),transparent_35%)]" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 font-sans text-xs font-medium uppercase tracking-wider text-emerald-800">
            {badgeText}
          </p>
          <h1 className="font-heading text-3xl font-semibold leading-tight text-emerald-950 sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-gray-600 sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register/buyer"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 font-sans text-base font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              {startBuyingLabel}
            </Link>
            <Link
              href="/register/seller"
              className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-3 font-sans text-base font-medium text-white shadow-sm transition hover:bg-orange-600"
            >
              {startSellingLabel}
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-xl shadow-emerald-100/60 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl bg-emerald-50 p-4">
              <p className="font-sans text-xs font-medium uppercase tracking-wide text-emerald-700">
                {buyerAppTitle}
              </p>
              <p className="mt-2 font-sans text-sm text-gray-600">
                {buyerAppDescription}
              </p>
            </article>
            <article className="rounded-2xl bg-orange-50 p-4">
              <p className="font-sans text-xs font-medium uppercase tracking-wide text-orange-700">
                {sellerAppTitle}
              </p>
              <p className="mt-2 font-sans text-sm text-gray-600">
                {sellerAppDescription}
              </p>
            </article>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-900 p-4 text-slate-100">
            <p className="font-heading text-lg font-medium">
              {statsTitle}
            </p>
            <p className="mt-2 font-sans text-xs text-slate-300">
              {statsSummary}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
