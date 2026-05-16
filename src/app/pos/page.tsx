"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarcodeScannerPanel, ScannerStatusTone } from "@/components/pos/barcode-scanner-panel";
import { CartBar } from "@/components/pos/CartBar";
import { CartItem } from "@/components/pos/CartItem";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { DiscountModal } from "@/components/pos/DiscountModal";
import { ProductCard } from "@/components/pos/ProductCard";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { normalizeProductImageUrl } from "@/lib/images/product-image";
import { cacheProducts, getCachedProductsPayload } from "@/lib/offline/products-cache";
import { productService } from "@/lib/api/services/product.service";
import { posService } from "@/lib/api/services/pos.service";
import { enqueuePOSOrder } from "@/hooks/pwa/use-sync-queue";
import { useAuthStore } from "@/store/auth.store";
import { usePOSCartStore } from "@/store/pos-cart.store";
import {
  POS_SELLER_DEFAULT_RETURN_PATH,
  POS_SELLER_AUTH_BACKUP_KEY,
  POS_SELLER_RETURN_PATH_KEY,
  POS_SELLER_SWITCH_FLAG_KEY,
  POS_SELLER_SWITCH_FLAG_VALUE,
} from "@/constants/pos-switch";
import { Product } from "@/types/product";
import { ScannerMode } from "@/types/store-config";

const isCameraSupported = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return Boolean(navigator.mediaDevices?.getUserMedia);
};

const isHardwareLikelyAvailable = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const finePointer = window.matchMedia?.("(pointer:fine)")?.matches;
  return Boolean(finePointer);
};

const resolveDefaultScannerMode = (
  allowedModes: ScannerMode[],
  configuredDefault: ScannerMode,
) => {
  const hasMode = (mode: ScannerMode) => allowedModes.includes(mode);

  if (hasMode("hardware") && isHardwareLikelyAvailable()) {
    return "hardware" as const;
  }

  if (hasMode("camera") && isCameraSupported()) {
    return "camera" as const;
  }

  if (hasMode(configuredDefault)) {
    return configuredDefault;
  }

  if (hasMode("manual")) {
    return "manual" as const;
  }

  return allowedModes[0] || "manual";
};

const normalizeScannerMode = (value: unknown): ScannerMode | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "camera" || normalized === "hardware" || normalized === "manual") {
    return normalized;
  }

  return null;
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

export default function POSPage() {
  const router = useRouter();
  const isMobile = useIsMobile() ?? false;
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [category, setCategory] = useState("all");
  const [scannerStatus, setScannerStatus] = useState("Scanner ready");
  const [scannerStatusTone, setScannerStatusTone] = useState<ScannerStatusTone>("info");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountModalSeed, setDiscountModalSeed] = useState(0);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [detailsQuantity, setDetailsQuantity] = useState(1);
  const [detailsNote, setDetailsNote] = useState("");
  const [detailsVariant, setDetailsVariant] = useState("Regular");
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);

  const role = useAuthStore((state) => state.user?.role);
  const setAuth = useAuthStore((state) => state.setAuth);

  const items = usePOSCartStore((state) => state.items);
  const addItem = usePOSCartStore((state) => state.addItem);
  const addConfiguredItem = usePOSCartStore((state) => state.addConfiguredItem);
  const setQuantity = usePOSCartStore((state) => state.setQuantity);
  const removeItem = usePOSCartStore((state) => state.removeItem);
  const clearCart = usePOSCartStore((state) => state.clearCart);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const payload = await productService.getMine({ page: 1, limit: 50 });
        await cacheProducts(payload);
        return payload;
      } catch {
        return getCachedProductsPayload();
      }
    },
  });

  const storeConfigQuery = useQuery({
    queryKey: ["store-config", "me"],
    queryFn: () => posService.getStoreConfig(),
    enabled: role === "POS",
  });

  const storeConfig = storeConfigQuery.data?.config;
  const barcodeEnabled = Boolean(storeConfig?.features?.barcodeScanning);
  const showBarcodeScannerPanel = Boolean(storeConfig?.uiBehavior?.showBarcodeScanner);
  const categoryLabelByKey = useMemo(() => {
    const catalog = Array.isArray(storeConfig?.uiBehavior?.categoryCatalog)
      ? storeConfig.uiBehavior.categoryCatalog
      : [];

    return catalog.reduce<Record<string, string>>((acc, entry) => {
      const key = String(entry?.key || "").trim().toLowerCase();
      const label = String(entry?.label || "").trim();

      if (key && label) {
        acc[key] = label;
      }

      return acc;
    }, {});
  }, [storeConfig?.uiBehavior?.categoryCatalog]);
  const categoryThumbnailByKey = useMemo(() => {
    const catalog = Array.isArray(storeConfig?.uiBehavior?.categoryCatalog)
      ? storeConfig.uiBehavior.categoryCatalog
      : [];

    return catalog.reduce<Record<string, string>>((acc, entry) => {
      const key = String(entry?.key || "").trim().toLowerCase();
      const imageFromAsset = entry?.images?.[0]?.thumbnailUrl || entry?.images?.[0]?.url;
      const image = normalizeProductImageUrl(imageFromAsset || entry?.image || "");

      if (key && image) {
        acc[key] = image;
      }

      return acc;
    }, {});
  }, [storeConfig?.uiBehavior?.categoryCatalog]);
  const categoryThumbnailShape =
    storeConfig?.uiBehavior?.categoryThumbnailShape === "circle"
      ? "circle"
      : "rounded";
  const categoryThumbClassName =
    categoryThumbnailShape === "circle" ? "rounded-full" : "rounded-md";

  const allowedScannerModes = useMemo<ScannerMode[]>(() => {
    const configuredModes = storeConfig?.uiBehavior?.scannerModes || [];
    const normalizedModes = Array.from(
      new Set(
        configuredModes
          .map((mode) => normalizeScannerMode(mode))
          .filter((mode): mode is ScannerMode => Boolean(mode)),
      ),
    );

    if (!normalizedModes.length) {
      return barcodeEnabled ? ["hardware", "camera", "manual"] : ["manual"];
    }

    if (barcodeEnabled && isCameraSupported() && !normalizedModes.includes("camera")) {
      normalizedModes.push("camera");
    }

    return ["hardware", "camera", "manual"].filter((mode) =>
      normalizedModes.includes(mode as ScannerMode),
    ) as ScannerMode[];
  }, [barcodeEnabled, storeConfig?.uiBehavior?.scannerModes]);

  const defaultScannerMode = useMemo(
    () =>
      resolveDefaultScannerMode(
        allowedScannerModes,
        storeConfig?.uiBehavior?.defaultScannerMode || "manual",
      ),
    [allowedScannerModes, storeConfig?.uiBehavior?.defaultScannerMode],
  );

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products],
  );

  const categories = useMemo(() => {
    const options = new Set<string>(["all"]);
    for (const product of products) {
      options.add(product.category);
    }

    return Array.from(options);
  }, [products]);

  const activeCategory = categories.includes(category) ? category : "all";

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "all" || product.category === activeCategory;
      const matchesText =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        String(product.barcode || "").toLowerCase().includes(query);

      return matchesCategory && matchesText;
    });
  }, [activeCategory, products, search]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
    [items],
  );

  const effectiveDiscount = Math.min(discountAmount, subtotal);

  const total = useMemo(
    () => Number(Math.max(0, subtotal - effectiveDiscount).toFixed(2)),
    [effectiveDiscount, subtotal],
  );

  const scannerStatusClassName =
    scannerStatusTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : scannerStatusTone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : scannerStatusTone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-sky-200 bg-sky-50 text-sky-700";

  const canBackToSeller = useMemo(() => {
    if (typeof window === "undefined" || role !== "POS") {
      return false;
    }

    const origin = window.sessionStorage.getItem(POS_SELLER_SWITCH_FLAG_KEY);
    const backup = window.sessionStorage.getItem(POS_SELLER_AUTH_BACKUP_KEY);
    const returnPath = window.sessionStorage.getItem(POS_SELLER_RETURN_PATH_KEY);
    return origin === POS_SELLER_SWITCH_FLAG_VALUE && Boolean(backup) && Boolean(returnPath);
  }, [role]);

  const addProductWithQuantity = (product: Product, quantity: number) => {
    const safeQuantity = Math.max(1, Math.min(quantity, product.stock));
    addConfiguredItem(product, {
      quantity: safeQuantity,
      variant: detailsVariant,
      note: detailsNote,
    });
  };

  const triggerAddedFeedback = (productName: string, productId?: string) => {
    setFlashMessage(`${productName} added to cart`);
    if (productId) {
      setHighlightProductId(productId);
      window.setTimeout(() => setHighlightProductId(null), 420);
    }
    window.setTimeout(() => setFlashMessage(null), 1200);
  };

  const addProductByBarcode = (rawBarcode: string) => {
    const normalized = normalizeBarcodeForCompare(rawBarcode);
    if (!normalized) {
      return false;
    }

    setBarcodeInput(rawBarcode.trim());
    const scanVariants = new Set(barcodeVariants(normalized));

    const matched = products.find((product) => {
      const productVariants = barcodeVariants(String(product.barcode || ""));
      return productVariants.some((variant) => scanVariants.has(variant));
    });

    if (matched && matched.stock > 0) {
      addItem(matched);
      triggerAddedFeedback(matched.name, matched._id);
      setScannerStatus("Matched barcode and added product");
      setScannerStatusTone("success");
      return true;
    }

    setScannerStatus("Barcode not matched to in-stock product");
    setScannerStatusTone("warning");
    return false;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        paymentMethod: "cash" as const,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant,
          note: item.note,
        })),
        scannedCode: barcodeEnabled ? barcodeInput.trim() : "",
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueuePOSOrder({
          ...payload,
          createdAt: Date.now(),
        }, "offline");
        return { queuedOffline: true, orderId: `offline-${Date.now()}` };
      }

      try {
        const result = await posService.createOrder(payload);
        return {
          queuedOffline: false,
          orderId: result.order._id,
        };
      } catch (error) {
        if (axios.isAxiosError(error) && !error.response) {
          await enqueuePOSOrder({
            ...payload,
            createdAt: Date.now(),
          }, "network-failure");
          return { queuedOffline: true, orderId: `offline-${Date.now()}` };
        }

        throw error;
      }
    },
    onSuccess: (result) => {
      clearCart();
      setDiscountAmount(0);
      setCheckoutOpen(false);
      if (result.queuedOffline) {
        setScannerStatus("Offline: order queued for sync");
        setScannerStatusTone("warning");
      } else {
        setScannerStatus(`Order created: ${result.orderId}`);
        setScannerStatusTone("success");
      }
      productsQuery.refetch();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to submit order";
      setScannerStatus(message);
      setScannerStatusTone("error");
    },
  });

  const goBackToSeller = () => {
    if (typeof window === "undefined") {
      return;
    }

    const backupRaw = window.sessionStorage.getItem(POS_SELLER_AUTH_BACKUP_KEY);
    const returnPath =
      window.sessionStorage.getItem(POS_SELLER_RETURN_PATH_KEY) ||
      POS_SELLER_DEFAULT_RETURN_PATH;
    if (!backupRaw) {
      return;
    }

    try {
      const backup = JSON.parse(backupRaw) as {
        accessToken: string;
        refreshToken: string;
        user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;
        sessionId?: string | null;
        posUsage?: ReturnType<typeof useAuthStore.getState>["posUsage"];
      };

      if (!backup.accessToken || !backup.refreshToken || !backup.user) {
        return;
      }

      setAuth(
        backup.accessToken,
        backup.refreshToken,
        backup.user,
        backup.sessionId || null,
        backup.posUsage || null,
      );
      window.sessionStorage.removeItem(POS_SELLER_AUTH_BACKUP_KEY);
      window.sessionStorage.removeItem(POS_SELLER_RETURN_PATH_KEY);
      window.sessionStorage.removeItem(POS_SELLER_SWITCH_FLAG_KEY);
      router.push(returnPath);
    } catch {
      window.sessionStorage.removeItem(POS_SELLER_AUTH_BACKUP_KEY);
      window.sessionStorage.removeItem(POS_SELLER_RETURN_PATH_KEY);
      window.sessionStorage.removeItem(POS_SELLER_SWITCH_FLAG_KEY);
    }
  };

  if (role !== "POS") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="font-heading text-2xl font-semibold text-amber-900">POS Access Required</h1>
        <p className="mt-2 text-sm text-amber-800">
          This dashboard is only available to POS cashier accounts.
        </p>
        <Link
          href="/seller/pos"
          className="mt-4 inline-block rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Open Seller POS Management
        </Link>
      </section>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-100 pb-24 md:min-h-full md:pb-6">
      {flashMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-lg transition">
          {flashMessage}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-screen-2xl gap-4 p-3 md:grid-cols-[minmax(0,1fr)_360px] md:p-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="space-y-3">
          <div className="sticky top-0 z-20 space-y-2 rounded-2xl bg-slate-100/95 pb-2 backdrop-blur md:top-1">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              {canBackToSeller ? (
                <button
                  type="button"
                  onClick={goBackToSeller}
                  className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Back to Seller
                </button>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Walk-in checkout</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Point of Sale</h1>
              <p className="text-sm text-slate-600">Fast cart building for front-counter checkout.</p>
              <Input
                autoFocus
                className="mt-3 h-11 border-slate-200 bg-slate-50 text-base focus-visible:border-brand-500 focus-visible:ring-brand-100"
                placeholder="Search products or scan barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  if (addProductByBarcode(search)) {
                    setSearch("");
                  }
                }}
              />
            </div>

            <div className="xl:hidden">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onChange={setCategory}
                labelByCategory={categoryLabelByKey}
                thumbnailByCategory={categoryThumbnailByKey}
                thumbnailShape={categoryThumbnailShape}
              />
            </div>

            {barcodeEnabled && showBarcodeScannerPanel && isMobile ? (
              <Link
                href="/scanner"
                className="flex h-12 items-center justify-center rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Scan Item
              </Link>
            ) : null}

            {barcodeEnabled && showBarcodeScannerPanel && !isMobile ? (
              <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                <div
                  className={`mb-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${scannerStatusClassName}`}
                >
                  {scannerStatus}
                </div>
                <BarcodeScannerPanel
                  modes={allowedScannerModes}
                  defaultMode={defaultScannerMode}
                  barcodeValue={barcodeInput}
                  onBarcodeValueChange={setBarcodeInput}
                  onBarcodeSubmit={addProductByBarcode}
                  onServerFrameDecode={async (imageData) => {
                    try {
                      const result = await posService.decodeBarcodeFrame({ imageData });
                      return result.barcode || null;
                    } catch {
                      return null;
                    }
                  }}
                  onStatusChange={(status, tone = "info") => {
                    setScannerStatus(status);
                    setScannerStatusTone(tone);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 xl:grid-cols-[200px_minmax(0,1fr)] xl:items-start">
            <aside className="hidden xl:block">
              <div className="sticky top-28 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Menu Categories
                </p>
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {cat !== "all" && categoryThumbnailByKey[cat] ? (
                          <img
                            src={categoryThumbnailByKey[cat]}
                            alt={categoryLabelByKey[cat] || cat}
                            className={`h-6 w-6 object-cover ring-1 ring-black/10 ${categoryThumbClassName}`}
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center text-[10px] font-bold uppercase ${categoryThumbClassName} ${
                              isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {cat === "all"
                              ? "All"
                              : (categoryLabelByKey[cat] || cat).slice(0, 2)}
                          </span>
                        )}
                        <span>
                          {cat === "all"
                            ? "All Items"
                            : categoryLabelByKey[cat] || cat}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div>
              {productsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-52 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                  No products match your filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      highlight={highlightProductId === product._id}
                      onQuickAdd={(pickedProduct) => {
                        addItem(pickedProduct);
                        triggerAddedFeedback(pickedProduct.name, pickedProduct._id);
                      }}
                      onOpenDetails={(pickedProduct) => {
                        setDetailsProduct(pickedProduct);
                        setDetailsQuantity(1);
                        setDetailsNote("");
                        setDetailsVariant("Regular");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="hidden self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:sticky md:top-4 md:flex md:max-h-[calc(100dvh-7.5rem)] md:flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Current Cart</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {itemCount} items
            </span>
          </div>
          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                Cart is empty.
              </p>
            ) : (
              items.map((item) => (
                <CartItem
                  key={item.lineKey}
                  item={item}
                  onIncrease={() => setQuantity(item.lineKey, item.quantity + 1)}
                  onDecrease={() => setQuantity(item.lineKey, item.quantity - 1)}
                  onRemove={() => removeItem(item.lineKey)}
                />
              ))
            )}
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>PHP {subtotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDiscountModalSeed((prev) => prev + 1);
                setDiscountOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              <span>Discount</span>
              <span>- PHP {effectiveDiscount.toFixed(2)}</span>
            </button>
            <div className="flex items-center justify-between text-lg font-bold text-slate-900">
              <span>Total</span>
              <span>PHP {total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              disabled={items.length === 0}
              className="h-11 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Review Checkout
            </button>
          </div>
        </aside>
      </div>

      <CartBar itemCount={itemCount} total={total} onOpenCart={() => setCheckoutOpen(true)} />

      <CheckoutModal
        open={checkoutOpen}
        items={items}
        subtotal={subtotal}
        discount={discountAmount}
        total={total}
        isSubmitting={submitMutation.isPending}
        onClose={() => setCheckoutOpen(false)}
        onOpenDiscount={() => {
          setDiscountModalSeed((prev) => prev + 1);
          setDiscountOpen(true);
        }}
        onCheckout={() => submitMutation.mutate()}
        onIncreaseItem={(lineKey) => {
          const item = items.find((entry) => entry.lineKey === lineKey);
          if (item) {
            setQuantity(lineKey, item.quantity + 1);
          }
        }}
        onDecreaseItem={(lineKey) => {
          const item = items.find((entry) => entry.lineKey === lineKey);
          if (item) {
            setQuantity(lineKey, item.quantity - 1);
          }
        }}
        onRemoveItem={removeItem}
      />

      <DiscountModal
        key={discountModalSeed}
        open={discountOpen}
        subtotal={subtotal}
        currentDiscount={effectiveDiscount}
        onClose={() => setDiscountOpen(false)}
        onApply={setDiscountAmount}
      />

      {detailsProduct ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-xl sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">{detailsProduct.name}</h3>
            <p className="mt-1 text-sm text-slate-500">PHP {detailsProduct.price.toFixed(2)} each</p>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Variant</label>
              <div className="mt-1 flex gap-2">
                {["Regular", "Large"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDetailsVariant(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      detailsVariant === option
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Quantity</span>
              <div className="inline-flex items-center rounded-full bg-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailsQuantity((prev) => Math.max(1, prev - 1))}
                  className="h-9 w-9 text-base font-bold text-slate-700"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                  {detailsQuantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDetailsQuantity((prev) => Math.min(prev + 1, detailsProduct.stock))
                  }
                  className="h-9 w-9 text-base font-bold text-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
              <textarea
                value={detailsNote}
                onChange={(event) => setDetailsNote(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Optional prep note"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDetailsProduct(null)}
                className="h-11 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  addProductWithQuantity(detailsProduct, detailsQuantity);
                  triggerAddedFeedback(`${detailsProduct.name} (${detailsVariant})`, detailsProduct._id);
                  setDetailsProduct(null);
                }}
                className="h-11 rounded-xl bg-brand-600 text-sm font-semibold text-white"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
