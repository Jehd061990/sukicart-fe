import Link from "next/link";

export default function BuyerTrackingPage() {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Buyer Order Tracking</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the live delivery tracking module to monitor rider location.
      </p>
      <Link
        href="/deliveries"
        className="mt-4 inline-block rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        Open Live Tracking Page
      </Link>
    </section>
  );
}
