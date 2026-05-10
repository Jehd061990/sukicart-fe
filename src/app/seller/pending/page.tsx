"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/lib/api/services/auth.service";
import { SELLER_PENDING_LOGIN_KEY } from "@/constants/seller-pending";
import { useAuthStore } from "@/store/auth.store";

const POLL_INTERVAL_MS = 4000;

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

type PendingCredentials = {
  identifier: string;
  password: string;
};

export default function SellerPendingPage() {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [statusMessage, setStatusMessage] = useState(
    "We are currently checking your account.",
  );
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [nextCheckInSeconds, setNextCheckInSeconds] = useState(
    Math.ceil(POLL_INTERVAL_MS / 1000),
  );
  const inFlightRef = useRef(false);

  const credentials = useMemo<PendingCredentials | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.sessionStorage.getItem(SELLER_PENDING_LOGIN_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as PendingCredentials;
      if (!parsed.identifier || !parsed.password) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (user?.role === "SELLER" && user?.status === "active") {
      router.replace("/seller/dashboard");
    }
  }, [hydrated, router, user?.role, user?.status]);

  useEffect(() => {
    if (!credentials) {
      return;
    }

    let stopped = false;

    const tryLogin = async () => {
      if (inFlightRef.current || stopped) {
        return;
      }

      inFlightRef.current = true;
      setLastCheckedAt(new Date());
      setNextCheckInSeconds(Math.ceil(POLL_INTERVAL_MS / 1000));
      try {
        const response = await authService.login({
          identifier: credentials.identifier,
          password: credentials.password,
          deviceId: getStableDeviceId(),
          deviceName:
            typeof window !== "undefined"
              ? window.navigator.userAgent
              : "Unknown",
        });

        setAuth(
          response.accessToken,
          response.refreshToken,
          response.user,
          response.sessionId || null,
          response.posUsage || null,
        );
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(SELLER_PENDING_LOGIN_KEY);
        }
        toast.success("Seller account approved. Redirecting to dashboard.");
        router.replace("/seller/dashboard");
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
            : "We are currently checking your account.";

        if (message.toLowerCase().includes("pending")) {
          setStatusMessage("We are currently checking your account.");
        } else {
          setStatusMessage(message);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    void tryLogin();
    const timer = window.setInterval(() => {
      void tryLogin();
    }, POLL_INTERVAL_MS);

    const countdownTimer = window.setInterval(() => {
      setNextCheckInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearInterval(countdownTimer);
    };
  }, [credentials, router, setAuth]);

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-sans text-xs font-medium uppercase tracking-widest text-orange-700">
          Seller Review
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-orange-950">
          We are currently checking your account.
        </h1>
        <p className="mt-3 font-sans text-base text-gray-600">
          Your seller application is under admin review. This page checks your approval status automatically and will open your dashboard as soon as you are approved.
        </p>

        <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="font-sans text-sm text-orange-900">{statusMessage}</p>
          <div className="mt-2 space-y-1 text-xs text-orange-800">
            <p>
              Last checked: {lastCheckedAt ? lastCheckedAt.toLocaleTimeString() : "Waiting for first check..."}
            </p>
            <p>
              Next automatic check in: {credentials ? `${nextCheckInSeconds}s` : "-"}
            </p>
          </div>
        </div>

        {!credentials ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No pending verification session was found. Please login again to continue.
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-orange-200 px-4 py-2 font-medium text-orange-700 transition hover:bg-orange-50"
          >
            Go to Login
          </Link>
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 font-medium transition hover:bg-muted"
          >
            Back to Landing
          </Link>
        </div>
      </section>
    </main>
  );
}
