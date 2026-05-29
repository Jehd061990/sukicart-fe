"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type Language = "en" | "tl" | "ceb";

const LANDING_LANGUAGE_STORAGE_KEY = "sukigo.landing.language";

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  tl: "Tagalog",
  ceb: "Bisaya",
};

const LANDING_CONTENT: Record<
  Language,
  {
    navbar: {
      login: string;
      startBuying: string;
      startSelling: string;
      languageLabel: string;
    };
    hero: {
      badge: string;
      title: string;
      subtitle: string;
      startBuying: string;
      startSelling: string;
      buyerAppTitle: string;
      buyerAppDescription: string;
      sellerAppTitle: string;
      sellerAppDescription: string;
      statsTitle: string;
      statsSummary: string;
    };
    roleCards: {
      buyerTitle: string;
      buyerItems: string[];
      sellerTitle: string;
      sellerItems: string[];
    };
    featuresTitle: string;
    features: Array<{ title: string; description: string }>;
    sellerPanel: {
      label: string;
      title: string;
      items: string[];
      cta: string;
    };
    buyerPanel: {
      label: string;
      title: string;
      items: string[];
      cta: string;
    };
    previewTitle: string;
    previewCards: Array<{ title: string; description: string }>;
    cta: {
      title: string;
      subtitle: string;
      primaryLabel: string;
      secondaryLabel: string;
    };
    footerTagline: string;
  }
> = {
  en: {
    navbar: {
      login: "Login",
      startBuying: "Start Buying",
      startSelling: "Start Selling",
      languageLabel: "Language",
    },
    hero: {
      badge: "LOCAL COMMERCE PLATFORM",
      title: "Your neighborhood stores, now in one app.",
      subtitle:
        "From grocery, hardware, pharmacy, and karenderya to retail and service shops, manage sales with POS + online ordering in one place.",
      startBuying: "Start Buying",
      startSelling: "Start Selling",
      buyerAppTitle: "Buyer App",
      buyerAppDescription: "Browse products, order fast, and track deliveries in one flow.",
      sellerAppTitle: "Seller App",
      sellerAppDescription:
        "Run POS and online orders for grocery, hardware, pharmacy, eatery, and more.",
      statsTitle: "Today in your area",
      statsSummary: "128 active buyers, 34 active sellers, 19 riders online",
    },
    roleCards: {
      buyerTitle: "Buyer",
      buyerItems: ["Browse stores", "Add to cart", "Track delivery"],
      sellerTitle: "Seller",
      sellerItems: ["Register any store type", "Add products or menu", "Sell via POS + online"],
    },
    featuresTitle: "Built for daily operations across store types",
    features: [
      {
        title: "POS for walk-in customers",
        description:
          "Serve customers quickly with a phone-friendly POS checkout flow.",
      },
      {
        title: "Real-time delivery tracking",
        description:
          "Buyers can track rider location and order progress in real time.",
      },
      {
        title: "Inventory sync",
        description:
          "Online and POS orders share one stock count to avoid overselling.",
      },
      {
        title: "Multi-store marketplace",
        description:
          "Support grocery, hardware, pharmacy, karenderya, and more in one platform.",
      },
    ],
    sellerPanel: {
      label: "For Sellers",
      title: "For every kind of local store",
      items: [
        "No manual lista for daily sales",
        "Automatic inventory updates",
        "Accept walk-in + online orders",
      ],
      cta: "Register as Seller",
    },
    buyerPanel: {
      label: "For Buyers",
      title: "Order from nearby stores anytime",
      items: ["No need to visit each store", "Fast delivery updates", "More shop choices in one app"],
      cta: "Start Shopping",
    },
    previewTitle: "App Preview",
    previewCards: [
      {
        title: "POS screen",
        description: "Seller can process walk-in orders quickly.",
      },
      {
        title: "Order tracking",
        description: "Buyer sees rider updates and status timeline.",
      },
      {
        title: "Dashboard",
        description: "Seller tracks stock, sales, and active orders.",
      },
    ],
    cta: {
      title: "Start today",
      subtitle:
        "Join SukiGo as a buyer or seller and bring your neighborhood stores online.",
      primaryLabel: "Start Buying",
      secondaryLabel: "Start Selling",
    },
    footerTagline:
      "Built for buyers and local stores across groceries, hardware, pharmacies, eateries, and more.",
  },
  tl: {
    navbar: {
      login: "Mag-login",
      startBuying: "Mamili",
      startSelling: "Magsimulang Magbenta",
      languageLabel: "Wika",
    },
    hero: {
      badge: "PLATFORM PARA SA NEGOSYO",
      title: "Mga tindahan sa inyong lugar, nasa iisang app na.",
      subtitle:
        "Mula grocery, hardware, botica, karenderya hanggang retail at service shops, puwedeng POS + online ordering sa iisang sistema.",
      startBuying: "Mamili",
      startSelling: "Magsimulang Magbenta",
      buyerAppTitle: "Buyer App",
      buyerAppDescription:
        "Mag-browse ng products, mag-order agad, at i-track ang delivery sa iisang flow.",
      sellerAppTitle: "Seller App",
      sellerAppDescription:
        "Gamitin ang POS at online orders para sa grocery, hardware, botica, karenderya, at iba pa.",
      statsTitle: "Ngayong araw sa inyong area",
      statsSummary: "128 active buyers, 34 active sellers, 19 riders online",
    },
    roleCards: {
      buyerTitle: "Buyer",
      buyerItems: ["Mag-browse ng stores", "Mag-add to cart", "I-track ang delivery"],
      sellerTitle: "Seller",
      sellerItems: ["Mag-register ng anumang store type", "Magdagdag ng produkto o menu", "Magbenta via POS + online"],
    },
    featuresTitle: "Ginawa para sa araw-araw na operasyon ng iba't ibang tindahan",
    features: [
      {
        title: "POS para sa walk-in customers",
        description: "Mas mabilis ang checkout gamit ang phone-friendly POS flow.",
      },
      {
        title: "Real-time delivery tracking",
        description:
          "Makikita ng buyer ang lokasyon ng rider at progreso ng order sa real time.",
      },
      {
        title: "Inventory sync",
        description:
          "Magkapareho ang stock count ng online at POS para iwas overselling.",
      },
      {
        title: "Marketplace para sa iba't ibang tindahan",
        description:
          "Suporta sa grocery, hardware, botica, karenderya, at iba pa sa iisang platform.",
      },
    ],
    sellerPanel: {
      label: "Para sa Sellers",
      title: "Para sa lahat ng uri ng lokal na tindahan",
      items: [
        "Wala nang manual lista sa benta",
        "Automatic ang inventory updates",
        "Tanggap ang walk-in + online orders",
      ],
      cta: "Mag-register bilang Seller",
    },
    buyerPanel: {
      label: "Para sa Buyers",
      title: "Umorder sa malapit na stores kahit kailan",
      items: ["Di na kailangang puntahan isa-isa", "Mabilis na delivery updates", "Mas maraming pagpipiliang shop"],
      cta: "Simulang Mamili",
    },
    previewTitle: "App Preview",
    previewCards: [
      {
        title: "POS screen",
        description: "Mabilis ma-process ng seller ang walk-in orders.",
      },
      {
        title: "Order tracking",
        description: "Nakikita ng buyer ang updates ng rider at status timeline.",
      },
      {
        title: "Dashboard",
        description: "Namomonitor ng seller ang stock, sales, at active orders.",
      },
    ],
    cta: {
      title: "Magsimula ngayon",
      subtitle:
        "Sumali sa SukiGo bilang buyer o seller at dalhin online ang mga tindahan sa inyong lugar.",
      primaryLabel: "Mamili",
      secondaryLabel: "Magsimulang Magbenta",
    },
    footerTagline:
      "Ginawa para sa buyers at lokal na stores tulad ng groceries, hardware, botica, karenderya, at iba pa.",
  },
  ceb: {
    navbar: {
      login: "Login",
      startBuying: "Sugod Palit",
      startSelling: "Sugod Baligya",
      languageLabel: "Pinulongan",
    },
    hero: {
      badge: "PLATFORM PARA SA NEGOSYO",
      title: "Ang mga tindahan sa inyong lugar, naa na sa usa ka app.",
      subtitle:
        "Gikan grocery, hardware, botica, karenderya hangtod retail ug service shops, pwede na ang POS + online ordering sa usa ka sistema.",
      startBuying: "Sugod Palit",
      startSelling: "Sugod Baligya",
      buyerAppTitle: "Buyer App",
      buyerAppDescription:
        "Tan-awa ang produkto, dali mo-order, ug i-track ang delivery sa usa ka flow.",
      sellerAppTitle: "Seller App",
      sellerAppDescription:
        "Gamita ang POS ug online orders para sa grocery, hardware, botica, karenderya, ug uban pa.",
      statsTitle: "Karon sa inyong area",
      statsSummary: "128 active buyers, 34 active sellers, 19 riders online",
    },
    roleCards: {
      buyerTitle: "Buyer",
      buyerItems: ["Browse sa stores", "Add to cart", "Track delivery"],
      sellerTitle: "Seller",
      sellerItems: ["Register bisan unsang store type", "Add products o menu", "Baligya via POS + online"],
    },
    featuresTitle: "Gibuhat para sa adlaw-adlaw nga operasyon sa lain-laing tindahan",
    features: [
      {
        title: "POS para sa walk-in customers",
        description: "Mas paspas ang checkout gamit ang phone-friendly POS flow.",
      },
      {
        title: "Real-time delivery tracking",
        description:
          "Makita sa buyer ang lokasyon sa rider ug progreso sa order sa real time.",
      },
      {
        title: "Inventory sync",
        description:
          "Parehas ang stock count sa online ug POS para malikayan ang overselling.",
      },
      {
        title: "Marketplace para sa daghang klase nga tindahan",
        description:
          "Suporta sa grocery, hardware, botica, karenderya, ug uban pa sa usa ka platform.",
      },
    ],
    sellerPanel: {
      label: "Para sa Sellers",
      title: "Para sa tanang klase sa lokal nga tindahan",
      items: [
        "Wala nay manual lista sa baligya",
        "Automatic ang inventory updates",
        "Dawat walk-in + online orders",
      ],
      cta: "Register as Seller",
    },
    buyerPanel: {
      label: "Para sa Buyers",
      title: "Order sa duol nga stores bisan kanus-a",
      items: ["Di na kinahanglan moadto matag store", "Paspas nga delivery updates", "Mas daghang mapilian nga shops"],
      cta: "Sugod Shopping",
    },
    previewTitle: "App Preview",
    previewCards: [
      {
        title: "POS screen",
        description: "Maproseso dayon sa seller ang walk-in orders.",
      },
      {
        title: "Order tracking",
        description: "Makita sa buyer ang rider updates ug status timeline.",
      },
      {
        title: "Dashboard",
        description: "Matrack sa seller ang stock, sales, ug active orders.",
      },
    ],
    cta: {
      title: "Sugdi karon",
      subtitle:
        "Apil sa SukiGo isip buyer o seller ug i-online ang mga tindahan sa inyong lugar.",
      primaryLabel: "Sugod Palit",
      secondaryLabel: "Sugod Baligya",
    },
    footerTagline:
      "Gibuhat para sa buyers ug lokal nga stores sama sa groceries, hardware, botica, karenderya, ug uban pa.",
  },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLanguage = window.localStorage.getItem(
      LANDING_LANGUAGE_STORAGE_KEY,
    );

    if (
      storedLanguage === "en" ||
      storedLanguage === "tl" ||
      storedLanguage === "ceb"
    ) {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANDING_LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const content = useMemo(() => LANDING_CONTENT[language], [language]);

  const features = [
    {
      title: content.features[0].title,
      description: content.features[0].description,
      icon: HandCoins,
    },
    {
      title: content.features[1].title,
      description: content.features[1].description,
      icon: Radar,
    },
    {
      title: content.features[2].title,
      description: content.features[2].description,
      icon: ClipboardCheck,
    },
    {
      title: content.features[3].title,
      description: content.features[3].description,
      icon: Store,
    },
  ];

  return (
    <div className="bg-[#f8faf7]">
      <Navbar
        loginLabel={content.navbar.login}
        startBuyingLabel={content.navbar.startBuying}
        startSellingLabel={content.navbar.startSelling}
        languageLabel={content.navbar.languageLabel}
        language={language}
        onLanguageChange={(value) => setLanguage(value as Language)}
        languageOptions={[
          { value: "en", label: LANGUAGE_LABELS.en },
          { value: "tl", label: LANGUAGE_LABELS.tl },
          { value: "ceb", label: LANGUAGE_LABELS.ceb },
        ]}
      />
      <HeroSection
        badgeText={content.hero.badge}
        title={content.hero.title}
        subtitle={content.hero.subtitle}
        startBuyingLabel={content.hero.startBuying}
        startSellingLabel={content.hero.startSelling}
        buyerAppTitle={content.hero.buyerAppTitle}
        buyerAppDescription={content.hero.buyerAppDescription}
        sellerAppTitle={content.hero.sellerAppTitle}
        sellerAppDescription={content.hero.sellerAppDescription}
        statsTitle={content.hero.statsTitle}
        statsSummary={content.hero.statsSummary}
      />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-medium text-emerald-950 sm:text-2xl">
              {content.roleCards.buyerTitle}
            </h2>
            <ul className="mt-4 space-y-2 font-sans text-sm text-gray-600">
              {content.roleCards.buyerItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-medium text-orange-950 sm:text-2xl">
              {content.roleCards.sellerTitle}
            </h2>
            <ul className="mt-4 space-y-2 font-sans text-sm text-gray-600">
              {content.roleCards.sellerItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-heading text-center text-2xl font-medium text-emerald-950 sm:text-3xl">
            {content.featuresTitle}
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
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-orange-700">
              {content.sellerPanel.label}
            </p>
            <h2 className="mt-2 font-heading text-xl font-medium text-orange-950 sm:text-2xl">
              {content.sellerPanel.title}
            </h2>
            <ul className="mt-4 space-y-2 font-sans text-sm text-gray-600">
              {content.sellerPanel.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              href="/register/seller"
              className="mt-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-sans text-sm font-medium text-white transition hover:bg-orange-600"
            >
              {content.sellerPanel.cta}
            </Link>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-6 shadow-sm">
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-emerald-700">
              {content.buyerPanel.label}
            </p>
            <h2 className="mt-2 font-heading text-xl font-medium text-emerald-950 sm:text-2xl">
              {content.buyerPanel.title}
            </h2>
            <ul className="mt-4 space-y-2 font-sans text-sm text-gray-600">
              {content.buyerPanel.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              href="/register/buyer"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 font-sans text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              {content.buyerPanel.cta}
            </Link>
          </article>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-heading text-center text-2xl font-medium text-emerald-950 sm:text-3xl">
            {content.previewTitle}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <HandCoins className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-heading text-lg font-medium text-emerald-950">
                {content.previewCards[0].title}
              </h3>
              <p className="mt-2 font-sans text-sm text-gray-600">
                {content.previewCards[0].description}
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-heading text-lg font-medium text-emerald-950">
                {content.previewCards[1].title}
              </h3>
              <p className="mt-2 font-sans text-sm text-gray-600">
                {content.previewCards[1].description}
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Boxes className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-heading text-lg font-medium text-emerald-950">
                {content.previewCards[2].title}
              </h3>
              <p className="mt-2 font-sans text-sm text-gray-600">
                {content.previewCards[2].description}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <CTASection
            title={content.cta.title}
            subtitle={content.cta.subtitle}
            primaryLabel={content.cta.primaryLabel}
            primaryHref="/register/buyer"
            secondaryLabel={content.cta.secondaryLabel}
            secondaryHref="/register/seller"
          />
        </div>
      </section>

      <Footer tagline={content.footerTagline} />
    </div>
  );
}
