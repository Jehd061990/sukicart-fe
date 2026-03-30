import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          SukiCart Frontend
        </p>
        <h2 className="text-2xl font-semibold">
          Next.js Scalable Foundation Ready
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This workspace includes App Router, Tailwind, shadcn/ui, Zustand auth
          store, TanStack Query provider, and Axios service modules.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button>Open Products</Button>
          <Button variant="outline">View Orders</Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Orders Today", "24"],
          ["Revenue", "$1,240"],
          ["Pending Delivery", "9"],
          ["Low Stock Items", "7"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Next Step</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add feature pages under src/app, then create matching API service
          files under src/lib/api/services and hooks under src/hooks.
        </p>
      </section>
    </div>
  );
}
