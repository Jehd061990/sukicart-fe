import { z } from "zod";

export const STORE_TYPE_VALUES = [
  "grocery",
  "pharmacy",
  "hardware",
  "convenience",
  "retail",
] as const;

export type SellerStoreType = (typeof STORE_TYPE_VALUES)[number];

export const STORE_TYPE_OPTIONS: Array<{ label: string; value: SellerStoreType }> = [
  { label: "Grocery store", value: "grocery" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Hardware store", value: "hardware" },
  { label: "Convenience store", value: "convenience" },
  { label: "General retail", value: "retail" },
];

const LEGACY_TO_CANONICAL_STORE_TYPE: Record<string, SellerStoreType> = {
  gulay: "grocery",
  karne: "grocery",
  isda: "grocery",
  mixed: "retail",
};

export const normalizeSellerStoreType = (
  value: unknown,
): SellerStoreType => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "grocery";
  }

  if ((STORE_TYPE_VALUES as readonly string[]).includes(normalized)) {
    return normalized as SellerStoreType;
  }

  return LEGACY_TO_CANONICAL_STORE_TYPE[normalized] || "grocery";
};

export const sellerRegistrationSchema = z
  .object({
    fullName: z.string().min(1, "Full Name is required"),
    phoneNumber: z
      .string()
      .min(1, "Phone Number is required")
      .min(7, "Phone Number is too short"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    storeName: z.string().min(1, "Store Name is required"),
    storeType: z.enum(STORE_TYPE_VALUES, {
      message: "Store Type is required",
    }),
    marketLocation: z.string().optional(),
    exactAddress: z.string().optional(),
    dtiPermit: z.instanceof(File).optional().nullable(),
    validId: z.instanceof(File).optional().nullable(),
    handleOwnDelivery: z.boolean(),
    usePlatformRiders: z.boolean(),
    acceptTerms: z.boolean(),
  })
  .refine((value) => value.handleOwnDelivery || value.usePlatformRiders, {
    message: "Select at least one delivery option",
    path: ["handleOwnDelivery"],
  })
  .refine((value) => value.acceptTerms, {
    message: "You must accept Terms & Conditions",
    path: ["acceptTerms"],
  });

export type SellerRegistrationFormValues = z.infer<
  typeof sellerRegistrationSchema
>;

export type SellerRegistrationDraft = Omit<
  SellerRegistrationFormValues,
  "dtiPermit" | "validId"
> & {
  dtiPermitName: string;
  validIdName: string;
};

export const sellerRegistrationDraftDefaults: SellerRegistrationDraft = {
  fullName: "",
  phoneNumber: "",
  email: "",
  password: "",
  storeName: "",
  storeType: "grocery",
  marketLocation: "",
  exactAddress: "",
  handleOwnDelivery: false,
  usePlatformRiders: true,
  acceptTerms: false,
  dtiPermitName: "",
  validIdName: "",
};
