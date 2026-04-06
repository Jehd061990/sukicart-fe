import Link from "next/link";

interface CTASectionProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export function CTASection({
  title,
  subtitle,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: CTASectionProps) {
  return (
    <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-8 text-white shadow-xl sm:px-8">
      <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-emerald-50 sm:text-base">
        {subtitle}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex items-center justify-center rounded-2xl border border-white/60 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
