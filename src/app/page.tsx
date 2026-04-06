import Link from "next/link";
import {
  Boxes,
  ClipboardCheck,
  HandCoins,
  Radar,
  Store,
  Truck,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureCard } from "@/components/landing/feature-card";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  const features = [
    {
      title: "POS for walk-in customers",
      description:
        "Serve suki customers quickly with a phone-friendly POS checkout flow.",
      icon: HandCoins,
    },
    {
      title: "Real-time delivery tracking",
      description:
        "Buyers can track rider location and order progress in real time.",
      icon: Radar,
    },
    {
      title: "Inventory sync",
      description:
        "Online and POS orders share one stock count to avoid overselling.",
      icon: ClipboardCheck,
    },
    {
      title: "Multi-vendor marketplace",
      description:
        "Bring multiple palengke vendors into one digital marketplace.",
      icon: Store,
    },
  ];

  return (
    <div className="bg-[#f8faf7]">
      <Navbar />
      <HeroSection />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-emerald-950">Buyer</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Browse products</li>
              <li>Add to cart</li>
              <li>Track delivery</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-orange-950">Seller</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Register store</li>
              <li>Add products</li>
              <li>Sell via POS + online</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-2xl font-black text-emerald-950 sm:text-3xl">
            Built for local market operations
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-orange-100 bg-linear-to-br from-orange-50 to-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">
              For Sellers
            </p>
            <h2 className="mt-2 text-2xl font-black text-orange-950">
              Para sa mga tindero sa palengke
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-orange-900/90">
              <li>Walay manual lista</li>
              <li>Automatic inventory</li>
              <li>Naay online orders</li>
            </ul>
            <Link
              href="/register/seller"
              className="mt-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Register as Seller
            </Link>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              For Buyers
            </p>
            <h2 className="mt-2 text-2xl font-black text-emerald-950">
              Fresh goods, diretso sa imong balay
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-emerald-900/90">
              <li>No need mo adto sa palengke</li>
              <li>Fast delivery</li>
              <li>Affordable prices</li>
            </ul>
            <Link
              href="/register/buyer"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Start Shopping
            </Link>
          </article>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-2xl font-black text-emerald-950 sm:text-3xl">
            App Preview
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <HandCoins className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-bold text-emerald-950">POS screen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Seller can process walk-in orders fast.
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-bold text-emerald-950">
                Order tracking
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Buyer sees rider updates and status timeline.
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Boxes className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-bold text-emerald-950">Dashboard</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Seller tracks stock, sales, and active orders.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <CTASection
            title="Sugdi na karon!"
            subtitle="Join SukiCart today as a buyer or seller and bring the local market online."
            primaryLabel="Start Buying"
            primaryHref="/register/buyer"
            secondaryLabel="Start Selling"
            secondaryHref="/register/seller"
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
