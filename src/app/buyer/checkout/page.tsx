"use client";

import { Suspense } from "react";
import { BuyerCheckoutForm } from "@/components/buyer/BuyerCheckoutForm";

export default function BuyerCheckoutPage() {
  return (
    <Suspense fallback={<section className="px-4 py-6 text-sm text-gray-600">Loading checkout...</section>}>
      <BuyerCheckoutForm />
    </Suspense>
  );
}
