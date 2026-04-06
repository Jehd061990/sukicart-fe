import Link from "next/link";

export default function SellerPOSPage() {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Seller POS</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Open the existing POS module for walk-in customer checkout.
      </p>
      <Link
        href="/pos"
        className="mt-4 inline-block rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        Open POS Module
      </Link>
    </section>
  );
}
