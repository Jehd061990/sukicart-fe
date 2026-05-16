"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { InputField } from "@/components/forms/input-field";
import { TextArea } from "@/components/forms/text-area";
import { SubmitButton } from "@/components/forms/submit-button";
import { buyerService } from "@/lib/api/services/buyer.service";
import { useAuthStore } from "@/store/auth.store";
import {
  BuyerRegistrationFormValues,
  buyerRegistrationSchema,
} from "@/types/buyer-registration";

export default function RegisterBuyerPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BuyerRegistrationFormValues>({
    resolver: zodResolver(buyerRegistrationSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      email: "",
      password: "",
      city: "Davao",
      barangay: "",
      streetAddress: "",
      landmark: "",
      notes: "",
    },
  });

  const onSubmit = async (values: BuyerRegistrationFormValues) => {
    try {
      const response = await buyerService.register(values);
      if (response.accessToken && response.refreshToken && response.user) {
        setAuth(
          response.accessToken,
          response.refreshToken,
          response.user,
          response.sessionId || null,
          null,
        );
      }
      toast.success("Welcome! Start shopping now.");
      router.push("/buyer/home");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Buyer registration failed. Please try again.";

      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-sans text-xs font-medium uppercase tracking-widest text-emerald-700">
          Buyer Registration
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-emerald-950">
          Start Buying
        </h1>
        <p className="mt-3 font-sans text-base text-gray-600">
          Fast and simple signup so you can start ordering fresh goods.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <InputField
            label="Full Name"
            name="fullName"
            register={register}
            error={errors.fullName}
            required
            placeholder="Maria Santos"
            autoFocus
          />

          <InputField
            label="Phone Number"
            name="phoneNumber"
            register={register}
            error={errors.phoneNumber}
            type="tel"
            required
            placeholder="09XX XXX XXXX"
          />

          <InputField
            label="Email (optional)"
            name="email"
            register={register}
            error={errors.email}
            type="email"
            placeholder="buyer@example.com"
          />

          <InputField
            label="Password"
            name="password"
            register={register}
            error={errors.password}
            type="password"
            required
            placeholder="At least 8 characters"
          />

          <InputField
            label="City"
            name="city"
            register={register}
            error={errors.city}
            placeholder="Davao"
          />

          <button
            type="button"
            onClick={() =>
              toast.info("Use current location feature coming soon.")
            }
            className="inline-flex items-center rounded-xl border px-4 py-2 font-sans text-sm font-medium hover:bg-muted"
          >
            Use current location
          </button>

          <InputField
            label="Barangay"
            name="barangay"
            register={register}
            error={errors.barangay}
            required
            placeholder="Talomo"
          />

          <InputField
            label="Street Address"
            name="streetAddress"
            register={register}
            error={errors.streetAddress}
            required
            placeholder="Purok 3, Door 4"
          />

          <InputField
            label="Landmark (optional)"
            name="landmark"
            register={register}
            error={errors.landmark}
            placeholder="Near chapel"
          />

          <TextArea
            label="Notes (optional)"
            name="notes"
            register={register}
            error={errors.notes}
            placeholder="Leave at gate"
          />

          <SubmitButton
            isLoading={isSubmitting}
            disabled={isSubmitting}
            label="Create Buyer Account"
          />
        </form>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border px-4 py-2 font-sans text-sm font-medium hover:bg-muted"
        >
          Back to Landing Page
        </Link>
      </section>
    </div>
  );
}
