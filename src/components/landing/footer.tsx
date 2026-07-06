interface FooterProps {
  tagline?: string;
}

export function Footer({
  tagline = "Built for buyers and market sellers in the Philippines.",
}: FooterProps) {
  return (
    <footer className="border-t border-emerald-100 bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-emerald-800">SukiGo</p>
        <p>{tagline}</p>
      </div>
    </footer>
  );
}
