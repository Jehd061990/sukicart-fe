import { z } from "zod";

export const buyerRegistrationSchema = z.object({
  fullName: z.string().min(1, "Full Name is required"),
  phoneNumber: z
    .string()
    .min(1, "Phone Number is required")
    .min(7, "Phone Number is too short"),
  email: z
    .union([z.string().email("Enter a valid email"), z.literal("")])
    .optional(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  city: z.string().min(1, "City is required").default("Davao"),
  barangay: z.string().min(1, "Barangay is required"),
  streetAddress: z.string().min(1, "Street Address is required"),
  landmark: z.string().optional(),
  notes: z.string().optional(),
});

export type BuyerRegistrationFormValues = z.infer<
  typeof buyerRegistrationSchema
>;
