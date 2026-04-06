import { z } from "zod";

export const STORE_TYPE_OPTIONS = ["Gulay", "Karne", "Isda", "Mixed"] as const;

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
    storeType: z.enum(STORE_TYPE_OPTIONS, {
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
  storeType: "Gulay",
  marketLocation: "",
  exactAddress: "",
  handleOwnDelivery: false,
  usePlatformRiders: true,
  acceptTerms: false,
  dtiPermitName: "",
  validIdName: "",
};
