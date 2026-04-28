export default function BuyerHomePage() {
  return (
    <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-6 shadow-sm">
      <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 font-sans text-xs font-medium text-brand-700">
        Fresh picks, fair prices
      </p>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
        Buyer Home
      </h1>
      <p className="mt-2 font-sans text-sm text-gray-700">
        Start browsing products and prepare your next checkout.
      </p>
      <p className="mt-3 font-sans text-xs text-gray-600">
        Tip: watch orange deal badges for limited-time market discounts.
      </p>
    </section>
  );
}
