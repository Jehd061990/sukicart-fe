"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authService } from "@/lib/api/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/types/auth";
import { InputField } from "@/components/forms/input-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { z } from "zod";

const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

type LoginRole = Extract<UserRole, "ADMIN" | "SELLER" | "BUYER" | "RIDER">;

const roleLabels: Record<LoginRole, string> = {
  ADMIN: "Admin",
  BUYER: "Buyer",
  SELLER: "Seller",
  RIDER: "Rider",
};

const roleDescriptions: Record<LoginRole, string> = {
  ADMIN: "Manage platform users, orders, and marketplace operations.",
  BUYER: "Browse products, manage cart, and track deliveries.",
  SELLER: "Manage your products, orders, POS, and inventory.",
  RIDER: "View assigned deliveries and update delivery status.",
};

const roleRedirects: Record<LoginRole, string> = {
  ADMIN: "/admin/dashboard",
  BUYER: "/buyer/home",
  SELLER: "/seller/dashboard",
  RIDER: "/rider",
};

const roles: LoginRole[] = ["ADMIN", "BUYER", "SELLER", "RIDER"];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [selectedRole, setSelectedRole] = useState<LoginRole>("ADMIN");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const helperText = useMemo(() => {
    if (selectedRole === "RIDER") {
      return "Use the rider account credentials provided by your dispatch/admin.";
    }

    if (selectedRole === "ADMIN") {
      return "Use your authorized admin credentials to manage platform operations.";
    }

    return `Use your registered ${roleLabels[selectedRole].toLowerCase()} account credentials.`;
  }, [selectedRole]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await authService.login(values);
      const returnedRole = response.user.role;

      if (returnedRole !== selectedRole) {
        toast.error(
          `This account is ${roleLabels[returnedRole]}. Please switch to ${roleLabels[returnedRole]} login.`,
        );
        return;
      }

      setAuth(response.accessToken, response.refreshToken, response.user);
      toast.success(`${roleLabels[returnedRole]} login successful`);
      router.push(roleRedirects[returnedRole]);
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
          : "Login failed. Please check your credentials and try again.";

      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(60%_80%_at_80%_0%,rgba(16,185,129,0.18),rgba(255,255,255,0)),linear-gradient(to_bottom,#f8fff9,#fff9f3)] px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr,1fr]">
        <article className="rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Login Portal
          </p>
          <h1 className="mt-2 text-3xl font-black text-emerald-950 sm:text-4xl">
            Access Your SukiCart Workspace
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose your role and sign in using your existing account.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => {
              const isSelected = selectedRole === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-emerald-100 bg-white hover:bg-emerald-50/60"
                  }`}
                >
                  <p className="text-sm font-bold text-emerald-950">
                    {roleLabels[role]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roleDescriptions[role]}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-emerald-900/85">{helperText}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              register={register}
              error={errors.email}
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
              isLoading={isSubmitting}
              disabled={isSubmitting}
              label={`Login as ${roleLabels[selectedRole]}`}
            />
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/register/buyer"
              className="rounded-xl border border-emerald-200 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Create Buyer Account
            </Link>
            <Link
              href="/register/seller"
              className="rounded-xl border border-orange-200 px-4 py-2 font-semibold text-orange-700 transition hover:bg-orange-50"
            >
              Register Seller
            </Link>
            <Link
              href="/"
              className="rounded-xl border px-4 py-2 font-semibold transition hover:bg-muted"
            >
              Back to Landing Page
            </Link>
          </div>
        </article>

        <aside className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">
            Role Guide
          </p>
          <h2 className="mt-2 text-2xl font-black text-orange-950">
            Which login should I use?
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-bold text-slate-950">Admin</p>
              <p className="mt-1 text-sm text-slate-900/85">
                For platform administrators managing users, riders, sellers, and
                orders.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-sm font-bold text-emerald-950">Buyer</p>
              <p className="mt-1 text-sm text-emerald-900/85">
                For customers placing orders and tracking deliveries.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <p className="text-sm font-bold text-orange-950">Seller</p>
              <p className="mt-1 text-sm text-orange-900/85">
                For store operators managing catalog, inventory, and POS sales.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <p className="text-sm font-bold text-sky-950">Rider</p>
              <p className="mt-1 text-sm text-sky-900/85">
                For delivery riders handling dispatch updates and completion.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
