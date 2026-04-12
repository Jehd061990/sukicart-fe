import { AdminDashboardStats } from "@/types/admin";

interface StatsGridProps {
  stats: AdminDashboardStats;
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  const cards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString() },
    { label: "Total Sellers", value: stats.totalSellers.toLocaleString() },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString() },
    {
      label: "Total Revenue",
      value: currencyFormatter.format(stats.totalRevenue || 0),
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border bg-card p-5 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "Loading..." : card.value}
          </p>
        </article>
      ))}
    </section>
  );
}
