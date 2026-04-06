import Link from "next/link";
import { StepperForm } from "@/components/forms/stepper-form";

export default function RegisterSellerPage() {
  return (
    <div className="min-h-screen bg-orange-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">
          Seller Registration
        </p>
        <h1 className="mt-2 text-3xl font-black text-orange-950">
          Start Selling
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Register your store and start selling online plus POS.
        </p>

        <div className="mt-6">
          <StepperForm />
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Back to Landing Page
        </Link>
      </section>
    </div>
  );
}
