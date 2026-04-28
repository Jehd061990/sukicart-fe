export default function SellerDashboardPage() {
  return (
    <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-brand-100 p-6 shadow-sm">
      <p className="inline-flex rounded-full bg-deal-100 px-3 py-1 font-sans text-xs font-medium text-deal-700">
        Seller operations hub
      </p>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
        Seller Dashboard
      </h1>
      <p className="mt-2 font-sans text-sm text-gray-700">
        View sales summary, order queue, and operational metrics.
      </p>
      <p className="mt-3 font-sans text-xs text-gray-600">
        Keep fulfillment smooth and highlight active promos with warm accents.
      </p>
    </section>
  );
}
