import Link from "next/link";

export default function RiderUpdateStatusPage() {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Rider Update Status</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Update order progress and monitor status timeline.
      </p>
      <Link
        href="/deliveries"
        className="mt-4 inline-block rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        Open Delivery Tracking Screen
      </Link>
    </section>
  );
}
