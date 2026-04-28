import Link from "next/link";

export default function RiderUpdateStatusPage() {
  return (
    <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-brand-100 p-6 shadow-sm">
      <p className="inline-flex rounded-full bg-deal-100 px-3 py-1 font-sans text-xs font-medium text-deal-700">
        Live delivery timeline
      </p>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
        Rider Update Status
      </h1>
      <p className="mt-2 font-sans text-sm text-gray-700">
        Update order progress and monitor status timeline.
      </p>
      <Link
        href="/deliveries"
        className="mt-4 inline-block rounded-md bg-brand-600 px-3 py-2 font-sans text-sm font-medium text-white hover:bg-brand-700"
      >
        Open Delivery Tracking Screen
      </Link>
    </section>
  );
}
