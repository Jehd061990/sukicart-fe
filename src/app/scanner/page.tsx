"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ComboStreakIndicator } from "@/components/scanner/ComboStreakIndicator";
import { FloatingAddOne } from "@/components/scanner/FloatingAddOne";
import { ItemPreviewToast } from "@/components/scanner/ItemPreviewToast";
import { ScanFeedback } from "@/components/scanner/ScanFeedback";
import { ScannerView } from "@/components/scanner/ScannerView";
import { useComboScanner } from "@/components/scanner/use-combo-scanner";
import { useScanner } from "@/components/scanner/use-scanner";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { productService } from "@/lib/api/services/product.service";
import { useAuthStore } from "@/store/auth.store";
import { usePOSCartStore } from "@/store/pos-cart.store";
import { useScannerStore } from "@/store/scanner.store";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const resolveProductImageUrl = (image?: string) => {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  const normalizedPath = image.startsWith("/") ? image : `/${image}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

const normalizeBarcodeForCompare = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^0-9A-Za-z]/g, "")
    .toLowerCase();

const barcodeVariants = (value: string) => {
  const normalized = normalizeBarcodeForCompare(value);
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  if (normalized.length === 13 && normalized.startsWith("0")) {
    variants.add(normalized.slice(1));
  }

  if (normalized.length === 12) {
    variants.add(`0${normalized}`);
  }

  return Array.from(variants);
};

interface ScanToastItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface FloatingAddOneEntry {
  id: number;
  leftPct: number;
  topPct: number;
}

export default function ScannerPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const hydrated = useAuthStore((state) => state.hydrated);
  const role = useAuthStore((state) => state.user?.role);

  const addItem = usePOSCartStore((state) => state.addItem);

  const canProcessScan = useScannerStore((state) => state.canProcessScan);

  const [manualCode, setManualCode] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [feedback, setFeedback] = useState("Align barcode inside frame");
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "success" | "error">("idle");
  const [toasts, setToasts] = useState<ScanToastItem[]>([]);
  const [addOneEntries, setAddOneEntries] = useState<FloatingAddOneEntry[]>([]);

  const { visibleCombo, intensityClass, onScanSuccess, onScanFailure } =
    useComboScanner();

  const productsQuery = useQuery({
    queryKey: ["products", "scanner"],
    queryFn: () => productService.getMine({ page: 1, limit: 120 }),
    enabled: role === "POS",
  });

  const products = useMemo(
    () => productsQuery.data?.products || [],
    [productsQuery.data?.products],
  );

  const playSuccessBeep = useCallback(() => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 920;
      gain.gain.value = 0.03;

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
      window.setTimeout(() => void context.close(), 180);
    } catch {
      // Ignore audio errors on devices that block autoplay audio.
    }
  }, []);

  const pushToast = useCallback((item: ScanToastItem) => {
    setToasts((prev) => [item, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== item.id));
    }, 2100);
  }, []);

  const popAddOne = useCallback(() => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const entry = {
      id,
      leftPct: 47 + Math.floor(Math.random() * 8),
      topPct: 52 + Math.floor(Math.random() * 8),
    };

    setAddOneEntries((prev) => [...prev, entry]);
    window.setTimeout(() => {
      setAddOneEntries((prev) => prev.filter((item) => item.id !== id));
    }, 1050);
  }, []);

  const processCode = useCallback(
    (rawCode: string) => {
      const normalized = normalizeBarcodeForCompare(rawCode);
      if (!normalized) {
        return;
      }

      const now = Date.now();
      if (!canProcessScan(normalized, now)) {
        return;
      }

      const scanVariants = new Set(barcodeVariants(normalized));

      const matched = products.find((product) => {
        if (!product.stock) {
          return false;
        }

        const productVariants = barcodeVariants(String(product.barcode || ""));
        return productVariants.some((variant) => scanVariants.has(variant));
      });

      if (!matched) {
        onScanFailure();
        setFeedback("No matching item found");
        setFeedbackTone("error");
        return;
      }

      addItem(matched);
      onScanSuccess(normalized, now);

      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      playSuccessBeep();
      popAddOne();
      setFeedback(`Added ${matched.name}`);
      setFeedbackTone("success");

      pushToast({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: matched.name,
        price: matched.price,
        quantity: 1,
        image: resolveProductImageUrl(matched.image),
      });

      window.setTimeout(() => {
        setFeedback("Align barcode inside frame");
        setFeedbackTone("idle");
      }, 900);
    },
    [
      addItem,
      canProcessScan,
      onScanFailure,
      onScanSuccess,
      playSuccessBeep,
      popAddOne,
      products,
      pushToast,
    ],
  );

  const {
    scannerRef,
    isActive,
    error,
    start,
    torchOn,
    torchSupported,
    toggleTorch,
  } = useScanner({
    onDetected: processCode,
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (role !== "POS") {
      router.replace("/login");
      return;
    }

    if (!isMobile) {
      router.replace("/pos");
      return;
    }

    void start();
  }, [hydrated, isMobile, role, router, start]);

  if (!hydrated || !isMobile) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 px-3 pb-24 pt-3 text-white">
      <ItemPreviewToast items={toasts} />

      <div className="mb-3 flex items-center justify-between">
        <ScanFeedback message={feedback} tone={feedbackTone} />
        <span className="text-[11px] text-slate-400">{isActive ? "Camera live" : "Starting camera..."}</span>
      </div>

      <ScannerView containerRef={scannerRef}>
        <ComboStreakIndicator count={visibleCombo} intensityClass={intensityClass} />
        <FloatingAddOne entries={addOneEntries} />
      </ScannerView>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {manualOpen ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Type barcode"
            className="h-12 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                processCode(manualCode);
                setManualCode("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              processCode(manualCode);
              setManualCode("");
            }}
            className="h-12 min-w-12 rounded-xl bg-brand-600 px-3 text-sm font-semibold"
          >
            Add
          </button>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)]">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/85 p-2 backdrop-blur">
          <button
            type="button"
            onClick={() => router.push("/pos")}
            className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-semibold"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setManualOpen((prev) => !prev)}
            className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-semibold"
          >
            Manual
          </button>
          <button
            type="button"
            disabled={!torchSupported}
            onClick={() => {
              void toggleTorch();
            }}
            className="min-h-12 rounded-xl bg-brand-600 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {torchOn ? "Flash On" : "Flash"}
          </button>
        </div>
      </div>
    </div>
  );
}
