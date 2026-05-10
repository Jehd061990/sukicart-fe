"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authService } from "@/lib/api/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/types/auth";
import { InputField } from "@/components/forms/input-field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  POS_SELLER_AUTH_BACKUP_KEY,
  POS_SELLER_RETURN_PATH_KEY,
  POS_SELLER_SWITCH_FLAG_KEY,
} from "@/constants/pos-switch";
import { z } from "zod";

const loginFormSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  BUYER: "Buyer",
  SELLER: "Seller",
  POS: "POS Cashier",
  RIDER: "Rider",
};

const roleRedirects: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  BUYER: "/buyer/home",
  SELLER: "/seller/dashboard",
  POS: "/pos",
  RIDER: "/rider",
};

const getStableDeviceId = () => {
  if (typeof window === "undefined") {
    return "server-device";
  }

  const storageKey = "sukigo-device-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.localStorage.setItem(storageKey, generated);
  return generated;
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isAutoRouting, setIsAutoRouting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsAutoRouting(true);
      const response = await authService.login({
        ...values,
        deviceId: getStableDeviceId(),
        deviceName: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      });
      const returnedRole = response.user.role;

      setAuth(
        response.accessToken,
        response.refreshToken,
        response.user,
        response.sessionId,
        response.posUsage || null,
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(POS_SELLER_SWITCH_FLAG_KEY);
        window.sessionStorage.removeItem(POS_SELLER_AUTH_BACKUP_KEY);
        window.sessionStorage.removeItem(POS_SELLER_RETURN_PATH_KEY);
      }
      toast.success(`Login successful. Redirecting to ${roleLabels[returnedRole]} workspace.`);
      router.push(roleRedirects[returnedRole]);
    } catch (error: unknown) {
      setIsAutoRouting(false);
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
          : "Login failed. Please check your credentials and try again.";

      toast.error(message);
    } finally {
      setIsAutoRouting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(60%_80%_at_80%_0%,rgba(16,185,129,0.18),rgba(255,255,255,0)),linear-gradient(to_bottom,#f8fff9,#fff9f3)] px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr,1fr]">
        <article className="rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <p className="font-sans text-xs font-medium uppercase tracking-widest text-emerald-700">
            Login Portal
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-emerald-950 sm:text-4xl">
            Access Your SukiGo Workspace
          </h1>
          <p className="mt-3 font-sans text-base text-gray-600">
            Sign in once with your account credentials and we will route you to the correct workspace automatically.
          </p>

          <p className="mt-4 font-sans text-sm text-gray-600">
            Use your email or username with your password.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <InputField
              label="Email or Username"
              name="identifier"
              type="text"
              placeholder="you@example.com or cashier.pos"
              register={register}
              error={errors.identifier}
              required
              autoFocus
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              register={register}
              error={errors.password}
              required
            />

            <SubmitButton
              isLoading={isSubmitting || isAutoRouting}
              disabled={isSubmitting || isAutoRouting}
              label="Login"
            />
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-3 font-sans text-sm">
            <Link
              href="/register/buyer"
              className="rounded-xl border border-emerald-200 px-4 py-2 font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              Create Buyer Account
            </Link>
            <Link
              href="/register/seller"
              className="rounded-xl border border-orange-200 px-4 py-2 font-medium text-orange-700 transition hover:bg-orange-50"
            >
              Register Seller
            </Link>
            <Link
              href="/"
              className="rounded-xl border px-4 py-2 font-medium transition hover:bg-muted"
            >
              Back to Landing Page
            </Link>
          </div>
        </article>

        <aside className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="font-sans text-xs font-medium uppercase tracking-widest text-orange-700">
            Unified Access
          </p>
          <h2 className="mt-2 font-heading text-xl font-medium text-orange-950 sm:text-2xl">
            One Login For All Roles
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="font-heading text-lg font-medium text-emerald-950">
                Automatic Role Routing
              </p>
              <p className="mt-1 font-sans text-sm text-gray-600">
                After login, SukiGo detects whether your account is Admin, Buyer, Seller, POS, or Rider and redirects you to the correct dashboard.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <p className="font-heading text-lg font-medium text-orange-950">
                Use Existing Credentials
              </p>
              <p className="mt-1 font-sans text-sm text-gray-600">
                No role selection is needed. Just sign in with your authorized email/username and password.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
