"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Language = "en" | "tl" | "ceb";

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  tl: "Tagalog",
  ceb: "Bisaya",
};

const TERMS_CONTENT: Record<
  Language,
  {
    title: string;
    sections: Array<{
      heading: string;
      paragraphs?: string[];
      bullets?: string[];
      subSections?: Array<{
        heading: string;
        paragraphs?: string[];
        bullets?: string[];
      }>;
    }>;
    acceptanceLabel: string;
    acceptanceHint: string;
    proceedCta: string;
    backCta: string;
  }
> = {
  en: {
    title: "Seller Terms and Conditions",
    sections: [
      {
        heading: "1. Introduction",
        paragraphs: [
          "By registering as a seller on this platform, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you may not proceed with registration or use of the platform services.",
        ],
      },
      {
        heading: "2. Platform Usage",
        paragraphs: [
          "The platform provides tools for managing products, processing orders, and facilitating online and in-store sales operations. Sellers are responsible for maintaining accurate business information, product listings, and order fulfillment.",
        ],
      },
      {
        heading: "3. Order Fulfillment and Delivery Integration",
        paragraphs: [
          "By using this platform, you expressly agree that your store will be integrated into the platform's delivery and logistics system.",
        ],
        subSections: [
          {
            heading: "3.1 Rider Pickup Authorization",
            paragraphs: ["You acknowledge and agree that:"],
            bullets: [
              "The platform may assign authorized third-party or platform-affiliated riders to pick up orders from your physical store.",
              "You must allow riders to enter your store premises for the purpose of collecting customer orders.",
              "You are not allowed to block, refuse, or intentionally delay rider pickups for valid online orders placed through the system.",
            ],
          },
          {
            heading: "3.2 Cooperation Requirement",
            paragraphs: ["Sellers are required to:"],
            bullets: [
              "Prepare orders within the agreed preparation time.",
              "Coordinate with assigned riders for smooth pickup and dispatch.",
              "Ensure staff awareness of delivery operations to avoid delays.",
            ],
          },
        ],
      },
      {
        heading: "4. Compliance and Performance",
        paragraphs: [
          "Failure to comply with delivery operations, including refusal of rider pickups, may result in:",
        ],
        bullets: [
          "Order cancellations",
          "Temporary suspension of seller account",
          "Restrictions on platform access",
          "Possible termination of seller privileges",
        ],
      },
      {
        heading: "5. Seller Responsibility",
        paragraphs: ["Sellers remain fully responsible for:"],
        bullets: [
          "Accuracy of product listings and pricing",
          "Availability of products listed online",
          "Proper packaging of orders before pickup",
          "Ensuring timely order preparation",
        ],
      },
      {
        heading: "6. Platform Rights",
        paragraphs: ["The platform reserves the right to:"],
        bullets: [
          "Modify delivery assignments and logistics providers at any time",
          "Monitor order fulfillment performance",
          "Enforce compliance with delivery and operational policies",
        ],
      },
      {
        heading: "7. Agreement Confirmation",
        paragraphs: ["By completing the registration process, you confirm that:"],
        bullets: [
          "You have read and understood these Terms and Conditions",
          "You agree to comply with all delivery and rider pickup policies",
          "You authorize the platform to coordinate pickups on your behalf",
        ],
      },
    ],
    acceptanceLabel: "I have read and accept the Terms and Conditions",
    acceptanceHint: "Please accept the Terms and Conditions before proceeding.",
    proceedCta: "Proceed to Seller Registration",
    backCta: "Back to Landing Page",
  },
  tl: {
    title: "Mga Tuntunin at Kundisyon para sa Seller",
    sections: [
      {
        heading: "1. Panimula",
        paragraphs: [
          "Sa pagrehistro bilang seller sa platform na ito, sumasang-ayon kang sundin at kilalanin ang mga Tuntunin at Kundisyong ito. Kung hindi ka sumasang-ayon, hindi ka maaaring magpatuloy sa rehistro o paggamit ng serbisyo ng platform.",
        ],
      },
      {
        heading: "2. Paggamit ng Platform",
        paragraphs: [
          "Nagbibigay ang platform ng mga tool para sa pamamahala ng produkto, pagproseso ng order, at online at in-store na bentahan. Responsibilidad ng seller na panatilihing tama ang business information, product listings, at order fulfillment.",
        ],
      },
      {
        heading: "3. Order Fulfillment at Delivery Integration",
        paragraphs: [
          "Sa paggamit ng platform na ito, malinaw mong pinapahintulutan na ma-integrate ang iyong store sa delivery at logistics system ng platform.",
        ],
      },
      {
        heading: "4. Pagsunod at Performance",
        paragraphs: [
          "Ang hindi pagsunod sa delivery operations, kabilang ang pagtanggi sa rider pickup, ay maaaring magresulta sa:",
        ],
        bullets: [
          "Pagkansela ng order",
          "Pansamantalang suspension ng seller account",
          "Limitasyon sa access sa platform",
          "Posibleng pagtanggal ng seller privileges",
        ],
      },
      {
        heading: "5. Responsibilidad ng Seller",
        paragraphs: ["Ang seller ay ganap na responsable sa:"],
        bullets: [
          "Tamang product listings at presyo",
          "Availability ng mga produktong nakalista online",
          "Maayos na packaging bago pickup",
          "Napapanahong paghahanda ng order",
        ],
      },
      {
        heading: "6. Karapatan ng Platform",
        paragraphs: ["May karapatan ang platform na:"],
        bullets: [
          "Baguhin ang delivery assignments at logistics providers anumang oras",
          "I-monitor ang order fulfillment performance",
          "Ipatupad ang pagsunod sa delivery at operational policies",
        ],
      },
      {
        heading: "7. Pagkumpirma ng Kasunduan",
        paragraphs: ["Sa pagtatapos ng registration, kinukumpirma mong:"],
        bullets: [
          "Nabasa at naunawaan mo ang mga Tuntunin at Kundisyon",
          "Sumasang-ayon kang sumunod sa delivery at rider pickup policies",
          "Pinapahintulutan mo ang platform na mag-coordinate ng pickups para sa iyo",
        ],
      },
    ],
    acceptanceLabel: "Nabasa ko at tinatanggap ko ang Mga Tuntunin at Kundisyon",
    acceptanceHint: "Kailangan mong tanggapin ang Mga Tuntunin at Kundisyon bago magpatuloy.",
    proceedCta: "Magpatuloy sa Seller Registration",
    backCta: "Bumalik sa Landing Page",
  },
  ceb: {
    title: "Seller Terms and Conditions",
    sections: [
      {
        heading: "1. Pasiuna",
        paragraphs: [
          "Pinaagi sa pagrehistro isip seller sa kini nga platform, mouyon ka sa pagsunod niini nga Terms and Conditions. Kung dili ka mouyon, dili ka makapadayon sa registration o paggamit sa serbisyo sa platform.",
        ],
      },
      {
        heading: "2. Paggamit sa Platform",
        paragraphs: [
          "Ang platform naghatag ug mga himan para sa pagdumala sa produkto, pagproseso sa orders, ug online ug in-store nga sales operations. Ang seller responsable sa tukma nga business information, product listings, ug order fulfillment.",
        ],
      },
      {
        heading: "3. Order Fulfillment ug Delivery Integration",
        paragraphs: [
          "Sa paggamit sa platform, imong giuyonan nga ang imong tindahan ma-integrate sa delivery ug logistics system sa platform.",
        ],
      },
      {
        heading: "4. Compliance ug Performance",
        paragraphs: [
          "Kung dili motuman sa delivery operations, apil ang pagdumili sa rider pickup, mahimong mosangpot sa:",
        ],
        bullets: [
          "Order cancellations",
          "Temporary suspension sa seller account",
          "Restrictions sa platform access",
          "Posibleng termination sa seller privileges",
        ],
      },
      {
        heading: "5. Responsibilidad sa Seller",
        paragraphs: ["Ang seller hingpit nga responsable sa:"],
        bullets: [
          "Sakto nga product listings ug presyo",
          "Availability sa products nga naka-list online",
          "Sakto nga packaging sa orders before pickup",
          "Pag-andam sa orders sa takdang oras",
        ],
      },
      {
        heading: "6. Katungod sa Platform",
        paragraphs: ["Ang platform adunay katungod sa:"],
        bullets: [
          "Usbon ang delivery assignments ug logistics providers bisan kanus-a",
          "Monitor sa order fulfillment performance",
          "Ipatuman ang compliance sa delivery ug operational policies",
        ],
      },
      {
        heading: "7. Pagkumpirma sa Kasabutan",
        paragraphs: ["Sa paghuman sa registration, imong gikumpirma nga:"],
        bullets: [
          "Nabasa ug nasabtan nimo ang Terms and Conditions",
          "Mouyon ka sa rider pickup ug delivery policies",
          "Gitugotan nimo ang platform nga mo-coordinate sa pickups alang nimo",
        ],
      },
    ],
    acceptanceLabel: "Nabasa nako ug gidawat nako ang Terms and Conditions",
    acceptanceHint: "Kinahanglan nimo dawaton ang Terms and Conditions sa dili pa mopadayon.",
    proceedCta: "Padayon sa Seller Registration",
    backCta: "Balik sa Landing Page",
  },
};

export default function SellerTermsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const content = useMemo(() => TERMS_CONTENT[language], [language]);

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-heading text-3xl font-semibold text-orange-950">{content.title}</h1>

        <div className="mt-4 max-w-56">
          <label
            htmlFor="terms-language"
            className="mb-1 block font-sans text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Language
          </label>
          <select
            id="terms-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="en">{LANGUAGE_LABELS.en}</option>
            <option value="tl">{LANGUAGE_LABELS.tl}</option>
            <option value="ceb">{LANGUAGE_LABELS.ceb}</option>
          </select>
        </div>

        <div className="mt-6 space-y-6 font-sans text-sm leading-7 text-gray-700">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-gray-900">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-2">
                  {paragraph}
                </p>
              ))}

              {section.bullets ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {section.subSections?.map((subSection) => (
                <div key={subSection.heading}>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{subSection.heading}</h3>
                  {subSection.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-2">
                      {paragraph}
                    </p>
                  ))}
                  {subSection.bullets ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {subSection.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}

              <hr className="mt-6 border-orange-100" />
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-200"
            />
            <span className="font-sans text-sm leading-6 text-gray-700">{content.acceptanceLabel}</span>
          </label>
          {!acceptedTerms ? (
            <p className="mt-1 font-sans text-xs text-destructive">{content.acceptanceHint}</p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/register/seller?step=3&acceptTerms=1&autoSubmit=1")}
            disabled={!acceptedTerms}
            className="inline-flex rounded-xl bg-orange-500 px-4 py-2 font-sans text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {content.proceedCta}
          </button>
          <Link
            href="/"
            className="inline-flex rounded-xl border border-gray-200 px-4 py-2 font-sans text-sm font-medium text-gray-700 transition hover:bg-muted"
          >
            {content.backCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
