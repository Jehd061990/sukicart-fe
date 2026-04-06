"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { InputField } from "@/components/forms/input-field";
import { SelectField } from "@/components/forms/select-field";
import { FileUpload } from "@/components/forms/file-upload";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { sellerService } from "@/lib/api/services/seller.service";
import { useSellerRegistrationStore } from "@/store/seller-registration.store";
import {
  sellerRegistrationSchema,
  SellerRegistrationFormValues,
  STORE_TYPE_OPTIONS,
} from "@/types/seller-registration";

const STEP_TITLES = [
  "Personal Info",
  "Store Details",
  "Business Verification",
  "Delivery Option",
  "Agreement",
] as const;

const STEP_FIELD_NAMES: Array<Array<keyof SellerRegistrationFormValues>> = [
  ["fullName", "phoneNumber", "email", "password"],
  ["storeName", "storeType", "marketLocation", "exactAddress"],
  ["dtiPermit", "validId"],
  ["handleOwnDelivery", "usePlatformRiders"],
  ["acceptTerms"],
];

export function StepperForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const draft = useSellerRegistrationStore((state) => state.draft);
  const setDraft = useSellerRegistrationStore((state) => state.setDraft);
  const clearDraft = useSellerRegistrationStore((state) => state.clearDraft);

  const {
    register,
    control,
    trigger,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SellerRegistrationFormValues>({
    resolver: zodResolver(sellerRegistrationSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: draft.fullName,
      phoneNumber: draft.phoneNumber,
      email: draft.email,
      password: draft.password,
      storeName: draft.storeName,
      storeType: draft.storeType,
      marketLocation: draft.marketLocation,
      exactAddress: draft.exactAddress,
      dtiPermit: null,
      validId: null,
      handleOwnDelivery: draft.handleOwnDelivery,
      usePlatformRiders: draft.usePlatformRiders,
      acceptTerms: draft.acceptTerms,
    },
  });

  const values = useWatch({
    control,
  });

  useEffect(() => {
    setDraft({
      fullName: values.fullName || "",
      phoneNumber: values.phoneNumber || "",
      email: values.email || "",
      password: values.password || "",
      storeName: values.storeName || "",
      storeType: values.storeType || "Gulay",
      marketLocation: values.marketLocation || "",
      exactAddress: values.exactAddress || "",
      handleOwnDelivery: Boolean(values.handleOwnDelivery),
      usePlatformRiders: Boolean(values.usePlatformRiders),
      acceptTerms: Boolean(values.acceptTerms),
      dtiPermitName: values.dtiPermit?.name || "",
      validIdName: values.validId?.name || "",
    });
  }, [setDraft, values]);

  const progress = useMemo(
    () => Math.round(((step + 1) / STEP_TITLES.length) * 100),
    [step],
  );

  const goNext = async () => {
    const fields = STEP_FIELD_NAMES[step];
    const isValid = await trigger(fields);

    if (!isValid) {
      toast.error("Please complete required fields before continuing.");
      return;
    }

    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  const onSubmit = async (formValues: SellerRegistrationFormValues) => {
    try {
      await sellerService.register(formValues);
      setSubmitSuccess(true);
      toast.success("Registration successful! Waiting for approval.");
      clearDraft();
      setTimeout(() => {
        router.push("/seller/dashboard");
      }, 1200);
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
          : "Registration failed. Please try again.";

      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
            Step {step + 1} of {STEP_TITLES.length}
          </p>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h2 className="text-xl font-black text-orange-950">
          {STEP_TITLES[step]}
        </h2>
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <InputField
            label="Full Name"
            name="fullName"
            register={register}
            error={errors.fullName}
            required
            placeholder="Juan Dela Cruz"
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
            label="Email"
            name="email"
            register={register}
            error={errors.email}
            type="email"
            required
            placeholder="seller@example.com"
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
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <InputField
            label="Store Name"
            name="storeName"
            register={register}
            error={errors.storeName}
            required
            placeholder="Suki Gulayan"
          />
          <SelectField
            label="Store Type"
            name="storeType"
            register={register}
            error={errors.storeType}
            required
            options={STORE_TYPE_OPTIONS.map((option) => ({
              label: option,
              value: option,
            }))}
          />
          <InputField
            label="Market Location"
            name="marketLocation"
            register={register}
            error={errors.marketLocation}
            placeholder="Carbon Market, Cebu City"
          />
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
              Exact Address
            </label>
            <textarea
              {...register("exactAddress")}
              rows={4}
              placeholder="Stall number, street, barangay"
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-emerald-500"
            />
            {errors.exactAddress ? (
              <p className="text-xs text-destructive">
                {errors.exactAddress.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <FileUpload
            label="Upload DTI Permit (optional)"
            accept="image/*,.pdf"
            fileName={values.dtiPermit?.name || draft.dtiPermitName}
            onChange={(file) => {
              setValue("dtiPermit", file, { shouldValidate: true });
            }}
          />
          <FileUpload
            label="Upload Valid ID (optional)"
            accept="image/*,.pdf"
            fileName={values.validId?.name || draft.validIdName}
            onChange={(file) => {
              setValue("validId", file, { shouldValidate: true });
            }}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <CheckboxField
            label="I handle my own delivery"
            name="handleOwnDelivery"
            register={register}
            error={errors.handleOwnDelivery}
          />
          <CheckboxField
            label="Use platform riders"
            name="usePlatformRiders"
            register={register}
          />
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <CheckboxField
            label="Accept Terms & Conditions"
            name="acceptTerms"
            register={register}
            error={errors.acceptTerms}
          />
          {submitSuccess ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Registration successful! Waiting for approval.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || isSubmitting}
          className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-base font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>

        {step < STEP_TITLES.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        ) : (
          <SubmitButton
            isLoading={isSubmitting}
            disabled={isSubmitting}
            label="Submit Registration"
          />
        )}
      </div>
    </form>
  );
}
