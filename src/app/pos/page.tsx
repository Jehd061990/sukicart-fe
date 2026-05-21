"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarcodeScannerPanel, ScannerStatusTone } from "@/components/pos/barcode-scanner-panel";
import { CartBar } from "@/components/pos/CartBar";
import { CartItem } from "@/components/pos/CartItem";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { DiscountModal } from "@/components/pos/DiscountModal";
import { ProductCard } from "@/components/pos/ProductCard";
import { SimplebarScroll } from "@/components/ui/simplebar-scroll";
import { Input } from "@/components/ui/input";
import { normalizeProductImageUrl } from "@/lib/images/product-image";
import { cacheProducts, getCachedProductsPayload } from "@/lib/offline/products-cache";
import { productService } from "@/lib/api/services/product.service";
import { posService } from "@/lib/api/services/pos.service";
import { usePOSDeviceProfile } from "@/hooks/pos/use-device-profile";
import { usePrinterManager } from "@/hooks/pos/use-printer-manager";
import { enqueuePOSOrder } from "@/hooks/pwa/use-sync-queue";
import { getAndroidBluetoothDiagnostics } from "@/lib/pos-printing/bridge-contracts";
import { printerService } from "@/lib/pos-printing/printer-service";
import { openReceiptPrintWindow } from "@/lib/pos-printing/receipt-template";
import { ReceiptPayload, ThermalPrinterDevice } from "@/lib/pos-printing/types";
import { useAuthStore } from "@/store/auth.store";
import { usePOSCartStore } from "@/store/pos-cart.store";
import { usePOSPrintStore } from "@/store/pos-print.store";
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

const normalizeMacAddress = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "")
    .slice(0, 12)
    .match(/.{1,2}/g)
    ?.join(":") || "";

const isValidMacAddress = (value: string) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value);

export default function POSPage() {
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
  const [showScannerPanel, setShowScannerPanel] = useState(true);
  const [showPrinterPanel, setShowPrinterPanel] = useState(false);
  const [isSavingPrinterDefault, setIsSavingPrinterDefault] = useState(false);
  const [manualPrinterMac, setManualPrinterMac] = useState("");
  const [isLoadingBluetoothDiagnostics, setIsLoadingBluetoothDiagnostics] = useState(false);
  const [bluetoothDiagnostics, setBluetoothDiagnostics] = useState<{
    isCapacitorNative: boolean;
    hasBridge: boolean;
    pluginName: string | null;
    methods: string[];
    permissionState: string;
    bluetoothEnabled: boolean | null;
  } | null>(null);
  const [printActionMessage, setPrintActionMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const role = useAuthStore((state) => state.user?.role);
  const cashierName = useAuthStore((state) => state.user?.name || "POS Cashier");

  const items = usePOSCartStore((state) => state.items);
  const addItem = usePOSCartStore((state) => state.addItem);
  const addConfiguredItem = usePOSCartStore((state) => state.addConfiguredItem);
  const setQuantity = usePOSCartStore((state) => state.setQuantity);
  const removeItem = usePOSCartStore((state) => state.removeItem);
  const clearCart = usePOSCartStore((state) => state.clearCart);

  const latestPrintStatus = usePOSPrintStore((state) => state.latestPrintStatus);
  const latestPrintMessage = usePOSPrintStore((state) => state.latestPrintMessage);
  const failedReceipts = usePOSPrintStore((state) => state.failedReceipts);
  const hydrateFailedReceipts = usePOSPrintStore((state) => state.hydrateFailedReceipts);
  const setLatestStatus = usePOSPrintStore((state) => state.setLatestStatus);
  const enqueueFailedReceipt = usePOSPrintStore((state) => state.enqueueFailedReceipt);
  const markRetried = usePOSPrintStore((state) => state.markRetried);
  const removeFailedReceipt = usePOSPrintStore((state) => state.removeFailedReceipt);

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
  const printingConfig = storeConfig?.printing || {};
  const preferredPrinterAdapter = printingConfig.preferredAdapter || undefined;
  const configuredPaperSize = printingConfig.paperSize || undefined;
  const configuredPrinterName = String(printingConfig.desktopPrinterName || "").trim() || undefined;
  const configuredBluetoothPrinter = printingConfig.bluetoothPrinter || null;
  const autoPrintEnabled = printingConfig.autoPrint !== false;
  const preferredPOSMode = storeConfigQuery.data?.store?.preferredPOSMode || "desktop";
  const runtimeProfile = usePOSDeviceProfile(preferredPOSMode);
  const isCompactLayout =
    runtimeProfile.runtimeMode === "android" ||
    runtimeProfile.runtimeMode === "ios" ||
    runtimeProfile.runtimeMode === "mobile" ||
    runtimeProfile.runtimeMode === "pwa";
  const isTabletLayout = runtimeProfile.runtimeMode === "tablet";
  const isDesktopLayout = runtimeProfile.runtimeMode === "desktop";
  const barcodeEnabled = Boolean(storeConfig?.features?.barcodeScanning);
  const showBarcodeScannerPanel = Boolean(storeConfig?.uiBehavior?.showBarcodeScanner);
  const selectedBluetoothPrinter: ThermalPrinterDevice | undefined =
    configuredBluetoothPrinter && (configuredBluetoothPrinter.printerMac || configuredBluetoothPrinter.printerName)
      ? {
          id:
            String(configuredBluetoothPrinter.printerMac || "").trim() ||
            String(configuredBluetoothPrinter.printerName || "").trim(),
          name: String(configuredBluetoothPrinter.printerName || "Bluetooth Printer").trim(),
          macAddress: String(configuredBluetoothPrinter.printerMac || "").trim() || undefined,
          connectionType: "bluetooth",
        }
      : undefined;
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

  const printerManager = usePrinterManager({
    context: {
      runtimeProfile,
      preferBluetooth: runtimeProfile.isAndroid,
      preferredAdapter: preferredPrinterAdapter,
      printerName: configuredPrinterName,
      selectedPrinter: selectedBluetoothPrinter,
      printerSettings:
        selectedBluetoothPrinter
          ? {
              printerName: selectedBluetoothPrinter.name,
              printerMac: selectedBluetoothPrinter.macAddress || selectedBluetoothPrinter.id,
              connectionType: "bluetooth",
              paperSize: configuredPaperSize || "58mm",
              autoReconnect: configuredBluetoothPrinter?.autoReconnect !== false,
            }
          : undefined,
    },
  });
  const activeBluetoothPrinter = printerManager.selectedPrinter || selectedBluetoothPrinter;

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

  useEffect(() => {
    void hydrateFailedReceipts();
  }, [hydrateFailedReceipts]);

  useEffect(() => {
    if (manualPrinterMac) {
      return;
    }

    const configuredMac = String(configuredBluetoothPrinter?.printerMac || "").trim();
    if (configuredMac) {
      setManualPrinterMac(normalizeMacAddress(configuredMac));
    }
  }, [configuredBluetoothPrinter?.printerMac, manualPrinterMac]);

  useEffect(() => {
    if (!showPrinterPanel || (!runtimeProfile.isAndroid && !runtimeProfile.isPWA)) {
      return;
    }

    const run = async () => {
      setIsLoadingBluetoothDiagnostics(true);
      try {
        const diagnostics = await getAndroidBluetoothDiagnostics();
        setBluetoothDiagnostics(diagnostics);
      } finally {
        setIsLoadingBluetoothDiagnostics(false);
      }
    };

    void run();
  }, [showPrinterPanel, runtimeProfile.isAndroid, runtimeProfile.isPWA]);

  useEffect(() => {
    if (!isDesktopLayout) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "F9") {
        event.preventDefault();
        if (items.length > 0) {
          setCheckoutOpen(true);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktopLayout, items.length]);

  useEffect(() => {
    if (!runtimeProfile.isAndroid || !configuredBluetoothPrinter?.autoReconnect || !activeBluetoothPrinter) {
      return;
    }

    const run = async () => {
      setLatestStatus("PRINTING", "Auto reconnecting saved Bluetooth printer...");
      const result = await printerService.autoReconnect(
        {
          runtimeProfile,
          preferBluetooth: true,
          preferredAdapter: "bluetooth",
          selectedPrinter: activeBluetoothPrinter,
          printerSettings: {
            printerName: activeBluetoothPrinter.name,
            printerMac: activeBluetoothPrinter.macAddress || activeBluetoothPrinter.id,
            connectionType: "bluetooth",
            paperSize: configuredPaperSize || "58mm",
            autoReconnect: true,
          },
        },
        activeBluetoothPrinter,
      );

      if (result.status === "CONNECTED") {
        setLatestStatus("PRINT_SUCCESS", result.message);
      } else {
        setLatestStatus("BLUETOOTH_DISCONNECTED", result.message);
      }
    };

    void run();
  }, [
    configuredBluetoothPrinter?.autoReconnect,
    configuredPaperSize,
    runtimeProfile,
    activeBluetoothPrinter,
    setLatestStatus,
  ]);

  const buildReceiptPayload = (orderId: string, itemSnapshot: typeof items): ReceiptPayload => {
    return {
      receiptId: `${orderId}-${Date.now()}`,
      orderId,
      createdAt: new Date().toISOString(),
      sellerName: storeConfigQuery.data?.store?.name || "SukiGo Store",
      cashierName,
      deviceName: runtimeProfile.runtimeMode.toUpperCase(),
      paperSize: configuredPaperSize || (runtimeProfile.isMobile ? "58mm" : "80mm"),
      items: itemSnapshot.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      discount: effectiveDiscount,
      total,
      vat: Number((total * 0.12).toFixed(2)),
      paymentMethod: "Cash",
      qrCodeValue: `SukiGo:${orderId}`,
      footerText: "Thank you for shopping with SukiGo!",
    };
  };

  const runReceiptPrint = async (receipt: ReceiptPayload) => {
    setLatestStatus("PRINTING", "Sending receipt to printer...");

    const result = await printerService.printReceipt(receipt, {
      runtimeProfile,
      preferBluetooth: runtimeProfile.isAndroid,
      preferredAdapter: preferredPrinterAdapter,
      printerName: configuredPrinterName,
      selectedPrinter: activeBluetoothPrinter,
      printerSettings:
        activeBluetoothPrinter && runtimeProfile.isAndroid
          ? {
              printerName: activeBluetoothPrinter.name,
              printerMac: activeBluetoothPrinter.macAddress || activeBluetoothPrinter.id,
              connectionType: "bluetooth",
              paperSize: configuredPaperSize || "58mm",
              autoReconnect: configuredBluetoothPrinter?.autoReconnect !== false,
            }
          : undefined,
    });

    setLatestStatus(result.status, result.message);

    if (result.status !== "PRINT_SUCCESS") {
      enqueueFailedReceipt(receipt, result.status, result.message);
      setPrintActionMessage("Receipt printing failed. Retry?");
      return;
    }

    setPrintActionMessage("Receipt printed successfully.");
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const itemSnapshot = [...items];
      const payload = {
        paymentMethod: "cash" as const,
        items: itemSnapshot.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant,
          note: item.note,
        })),
        scannedCode: barcodeEnabled ? barcodeInput.trim() : "",
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueuePOSOrder(
          {
            ...payload,
            createdAt: Date.now(),
          },
          "offline",
        );
        return {
          queuedOffline: true,
          orderId: `offline-${Date.now()}`,
          itemSnapshot,
        };
      }

      try {
        const result = await posService.createOrder(payload);
        return {
          queuedOffline: false,
          orderId: result.order._id,
          itemSnapshot,
        };
      } catch (error) {
        if (axios.isAxiosError(error) && !error.response) {
          await enqueuePOSOrder(
            {
              ...payload,
              createdAt: Date.now(),
            },
            "network-failure",
          );
          return {
            queuedOffline: true,
            orderId: `offline-${Date.now()}`,
            itemSnapshot,
          };
        }

        throw error;
      }
    },
    onSuccess: async (result) => {
      const receipt = buildReceiptPayload(result.orderId, result.itemSnapshot);

      clearCart();
      setDiscountAmount(0);
      setCheckoutOpen(false);

      if (result.queuedOffline) {
        setScannerStatus("Offline: order queued for sync");
        setScannerStatusTone("warning");
        enqueueFailedReceipt(receipt, "PRINTER_OFFLINE", "Order queued offline. Print later.");
      } else {
        setScannerStatus(`Order created: ${result.orderId}`);
        setScannerStatusTone("success");
        if (autoPrintEnabled) {
          await runReceiptPrint(receipt);
        } else {
          setLatestStatus("PRINT_SUCCESS", "Receipt created. Auto print is disabled in settings.");
        }
      }

      if (runtimeProfile.isAndroid && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(25);
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

  const retryFailedReceipt = async (receiptId: string) => {
    const failed = failedReceipts.find((entry) => entry.id === receiptId);
    if (!failed) {
      return;
    }

    setLatestStatus("PRINTING", "Retrying queued receipt...");
    const result = await printerService.printReceipt(failed.receipt, {
      runtimeProfile,
      preferBluetooth: runtimeProfile.isAndroid,
      preferredAdapter: preferredPrinterAdapter,
      printerName: configuredPrinterName,
      selectedPrinter: activeBluetoothPrinter,
      printerSettings:
        activeBluetoothPrinter && runtimeProfile.isAndroid
          ? {
              printerName: activeBluetoothPrinter.name,
              printerMac: activeBluetoothPrinter.macAddress || activeBluetoothPrinter.id,
              connectionType: "bluetooth",
              paperSize: configuredPaperSize || "58mm",
              autoReconnect: configuredBluetoothPrinter?.autoReconnect !== false,
            }
          : undefined,
    });

    markRetried(failed.id, result.status, result.message);
    setLatestStatus(result.status, result.message);

    if (result.status === "PRINT_SUCCESS") {
      removeFailedReceipt(failed.id);
    }
  };

  const reconnectPrinter = async () => {
    const adapter = printerService.getPreferredAdapter(
      runtimeProfile,
      runtimeProfile.isAndroid,
      preferredPrinterAdapter,
    );
    setLatestStatus("PRINTING", `Reconnecting ${adapter} printer...`);
    const result = await printerService.connectPrinter(
      {
        runtimeProfile,
        preferBluetooth: runtimeProfile.isAndroid,
        preferredAdapter: preferredPrinterAdapter,
        printerName: configuredPrinterName,
        selectedPrinter: activeBluetoothPrinter,
      },
      activeBluetoothPrinter,
    );
    if (result.status === "CONNECTED") {
      setLatestStatus("PRINT_SUCCESS", result.message);
      return;
    }

    setLatestStatus("BLUETOOTH_DISCONNECTED", result.message);
  };

  const scanBluetoothPrinters = async () => {
    const result = await printerManager.scanPrinters();
    setPrintActionMessage(result.message);
  };

  const connectBluetoothPrinter = async (printerId: string) => {
    const target = printerManager.discoveredPrinters.find((entry) => entry.id === printerId);
    if (!target) {
      return;
    }

    const result = await printerManager.connectPrinter(target);
    setPrintActionMessage(result.message);
    if (result.status === "CONNECTED") {
      setLatestStatus("PRINT_SUCCESS", result.message);
      return;
    }

    setLatestStatus("BLUETOOTH_DISCONNECTED", result.message);
  };

  const connectBluetoothByMac = async () => {
    const normalizedMac = normalizeMacAddress(manualPrinterMac);
    if (!isValidMacAddress(normalizedMac)) {
      setPrintActionMessage("Enter a valid printer MAC (example: AA:BB:CC:DD:EE:FF).");
      return;
    }

    setManualPrinterMac(normalizedMac);

    const manualPrinter: ThermalPrinterDevice = {
      id: normalizedMac,
      name: `Manual ${normalizedMac}`,
      macAddress: normalizedMac,
      connectionType: "bluetooth",
      paired: true,
    };

    const result = await printerManager.connectPrinter(manualPrinter);
    setPrintActionMessage(result.message);
    if (result.status === "CONNECTED") {
      setLatestStatus("PRINT_SUCCESS", result.message);
      return;
    }

    setLatestStatus("BLUETOOTH_DISCONNECTED", result.message);
  };

  const loadBluetoothDiagnostics = async () => {
    setIsLoadingBluetoothDiagnostics(true);
    try {
      const diagnostics = await getAndroidBluetoothDiagnostics();
      setBluetoothDiagnostics(diagnostics);
    } finally {
      setIsLoadingBluetoothDiagnostics(false);
    }
  };

  const disconnectBluetoothPrinter = async () => {
    const result = await printerManager.disconnectPrinter();
    setPrintActionMessage(result.message);
  };

  const printBluetoothTestReceipt = async () => {
    const result = await printerManager.printTestReceipt();
    setLatestStatus(result.status, result.message);
    setPrintActionMessage(result.message);
  };

  const saveDeviceDefaultPrinter = () => {
    const target = printerManager.selectedPrinter;

    if (!target || !storeConfig) {
      setPrintActionMessage("No printer selected to save.");
      return;
    }

    const run = async () => {
      setIsSavingPrinterDefault(true);

      try {
        await posService.updateStoreConfig({
          configOverrides: {
            printing: {
              ...storeConfig.printing,
              preferredAdapter: "bluetooth",
              paperSize: printerManager.paperSize,
              bluetoothPrinter: {
                printerName: target.name,
                printerMac: target.macAddress || target.id,
                connectionType: "bluetooth",
                paperSize: printerManager.paperSize,
                autoReconnect: printerManager.autoReconnect,
              },
            },
          },
        });

        await storeConfigQuery.refetch();
        setPrintActionMessage(`Saved ${target.name} as default printer for all POS sessions.`);
      } catch (error) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to save default printer";
        setPrintActionMessage(message);
      } finally {
        setIsSavingPrinterDefault(false);
      }
    };

    void run();
  };

  const removeDeviceDefaultPrinter = () => {
    if (!storeConfig) {
      return;
    }

    const run = async () => {
      setIsSavingPrinterDefault(true);

      try {
        printerManager.removeSavedPrinter();
        await posService.updateStoreConfig({
          configOverrides: {
            printing: {
              ...storeConfig.printing,
              bluetoothPrinter: null,
            },
          },
        });

        await storeConfigQuery.refetch();
        setPrintActionMessage("Removed shared default printer.");
      } catch (error) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to remove default printer";
        setPrintActionMessage(message);
      } finally {
        setIsSavingPrinterDefault(false);
      }
    };

    void run();
  };

  const saveReceiptAsPdf = (receiptId: string) => {
    const failed = failedReceipts.find((entry) => entry.id === receiptId);
    if (!failed) {
      return;
    }

    const opened = openReceiptPrintWindow(failed.receipt);
    if (!opened) {
      setLatestStatus("PRINT_FAILED", "Could not open print preview for PDF save");
      return;
    }

    setLatestStatus("PRINT_SUCCESS", "Receipt preview opened. Choose Save as PDF.");
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
    <div
      className={`relative h-full overflow-hidden bg-slate-100 ${
        isCompactLayout ? "pb-28" : "pb-6"
      }`}
    >
      {flashMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-lg transition">
          {flashMessage}
        </div>
      ) : null}

      <div className="px-3 pt-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Runtime: <strong>{runtimeProfile.runtimeMode.toUpperCase()}</strong> | Input: {runtimeProfile.inputMethod}
            </span>
            <span>
              Printer: <strong>{printerService.getPreferredAdapter(runtimeProfile, runtimeProfile.isAndroid, preferredPrinterAdapter)}</strong>
            </span>
            <span>
              Paper: <strong>{configuredPaperSize || "auto"}</strong>
            </span>
          </div>
          {latestPrintStatus ? (
            <p className="mt-1 text-xs text-slate-600">
              {latestPrintStatus}: {latestPrintMessage}
            </p>
          ) : null}
          {printActionMessage ? <p className="mt-1 text-xs text-amber-700">{printActionMessage}</p> : null}
        </div>

        {(runtimeProfile.isAndroid || runtimeProfile.isPWA) && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Printer Setup</p>
              <button
                type="button"
                onClick={() => setShowPrinterPanel((prev) => !prev)}
                className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
              >
                {showPrinterPanel ? "Hide" : "Show"}
              </button>
            </div>

            {showPrinterPanel ? (
              <div className="mt-3 space-y-2 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Plugin Debug
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadBluetoothDiagnostics()}
                      disabled={isLoadingBluetoothDiagnostics}
                      className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                    >
                      {isLoadingBluetoothDiagnostics ? "Loading..." : "Refresh"}
                    </button>
                  </div>
                  {bluetoothDiagnostics ? (
                    <div className="space-y-1 text-[11px]">
                      <p>
                        Native Runtime: <strong>{bluetoothDiagnostics.isCapacitorNative ? "YES" : "NO"}</strong>
                      </p>
                      <p>
                        Bridge Detected: <strong>{bluetoothDiagnostics.hasBridge ? "YES" : "NO"}</strong>
                      </p>
                      <p>
                        Plugin: <strong>{bluetoothDiagnostics.pluginName || "Unknown"}</strong>
                      </p>
                      <p>
                        Bluetooth Enabled: <strong>{bluetoothDiagnostics.bluetoothEnabled === null ? "Unknown" : bluetoothDiagnostics.bluetoothEnabled ? "YES" : "NO"}</strong>
                      </p>
                      <p>Permissions: {bluetoothDiagnostics.permissionState}</p>
                      <p>
                        Methods: {bluetoothDiagnostics.methods.length ? bluetoothDiagnostics.methods.join(", ") : "none"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Tap Refresh to inspect native plugin state.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
                  <p>
                    Connection: <strong>{printerManager.connectionStatus}</strong>
                  </p>
                  <p>
                    Active: <strong>{activeBluetoothPrinter?.name || "None"}</strong>
                  </p>
                  <p>{printerManager.statusMessage}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void scanBluetoothPrinters()}
                    disabled={printerManager.isScanning}
                    className="rounded-md bg-slate-800 px-2 py-1 font-medium text-white disabled:opacity-60"
                  >
                    {printerManager.isScanning ? "Scanning..." : "Scan Devices"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnectBluetoothPrinter()}
                    disabled={printerManager.isConnecting || printerManager.connectionStatus !== "CONNECTED"}
                    className="rounded-md bg-slate-600 px-2 py-1 font-medium text-white disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => void printBluetoothTestReceipt()}
                    className="rounded-md bg-emerald-600 px-2 py-1 font-medium text-white"
                  >
                    Test Print
                  </button>
                  <button
                    type="button"
                    onClick={saveDeviceDefaultPrinter}
                    disabled={isSavingPrinterDefault}
                    className="rounded-md bg-brand-600 px-2 py-1 font-medium text-white"
                  >
                    {isSavingPrinterDefault ? "Saving..." : "Save Default"}
                  </button>
                  <button
                    type="button"
                    onClick={removeDeviceDefaultPrinter}
                    disabled={isSavingPrinterDefault}
                    className="rounded-md bg-amber-600 px-2 py-1 font-medium text-white"
                  >
                    Remove Default
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Paper Size
                    </span>
                    <select
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                      value={printerManager.paperSize}
                      onChange={(event) =>
                        printerManager.setPaperSize(event.target.value === "80mm" ? "80mm" : "58mm")
                      }
                    >
                      <option value="58mm">58mm</option>
                      <option value="80mm">80mm</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Auto Reconnect</span>
                    <input
                      type="checkbox"
                      checked={printerManager.autoReconnect}
                      onChange={(event) => printerManager.setAutoReconnect(event.target.checked)}
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Manual MAC Connect (for paired BP-210/XPrinter)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={manualPrinterMac}
                      onChange={(event) => setManualPrinterMac(normalizeMacAddress(event.target.value))}
                      placeholder="AA:BB:CC:DD:EE:FF"
                      className="h-8 min-w-48 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => void connectBluetoothByMac()}
                      disabled={printerManager.isConnecting}
                      className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                    >
                      {printerManager.isConnecting ? "Connecting..." : "Connect by MAC"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {printerManager.discoveredPrinters.length ? (
                    printerManager.discoveredPrinters.map((printer) => {
                      const selected =
                        activeBluetoothPrinter?.id === printer.id ||
                        (activeBluetoothPrinter?.macAddress &&
                          activeBluetoothPrinter.macAddress === printer.macAddress);

                      return (
                        <div
                          key={printer.id}
                          className={`flex items-center justify-between rounded-lg border p-2 ${
                            selected ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-slate-800">{printer.name}</p>
                            <p className="text-[11px] text-slate-500">{printer.macAddress || printer.id}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void connectBluetoothPrinter(printer.id)}
                            disabled={printerManager.isConnecting}
                            className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            {selected && printerManager.isConnecting ? "Connecting..." : "Connect"}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 p-2 text-[11px] text-slate-500">
                      No discovered Bluetooth printers yet.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {failedReceipts.length > 0 ? (
        <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Receipt printing failed. Retry?</p>
          <div className="mt-2 space-y-2">
            {failedReceipts.slice(0, 2).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-amber-200 bg-white p-2 text-xs">
                <p className="font-medium text-slate-700">{entry.receipt.orderId}</p>
                <p className="text-slate-500">{entry.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void retryFailedReceipt(entry.id)}
                    className="rounded-md bg-emerald-600 px-2 py-1 font-medium text-white"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => saveReceiptAsPdf(entry.id)}
                    className="rounded-md bg-slate-700 px-2 py-1 font-medium text-white"
                  >
                    Save PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void reconnectPrinter()}
                    className="rounded-md bg-amber-600 px-2 py-1 font-medium text-white"
                  >
                    Reconnect Printer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`grid h-full gap-4 p-3 ${
          isDesktopLayout
            ? "xl:grid-cols-[220px_minmax(0,1fr)_390px]"
            : isTabletLayout
              ? "md:grid-cols-[minmax(0,1fr)_330px]"
              : ""
        }`}
      >
        {isDesktopLayout ? (
          <aside className="hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 xl:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Desktop POS</p>
            <nav className="mt-3 space-y-2 text-sm">
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="w-full rounded-lg bg-slate-100 px-3 py-2 text-left font-medium text-slate-700"
              >
                Quick Search (Ctrl+F)
              </button>
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-left font-medium text-white"
              >
                Checkout (F9)
              </button>
              <Link
                href="/scanner"
                className="block rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700"
              >
                Camera Scanner
              </Link>
            </nav>
          </aside>
        ) : null}

        <section className="flex min-h-0 flex-col gap-3">
          <div className="sticky top-0 z-20 space-y-2 rounded-2xl bg-slate-100/95 pb-2 backdrop-blur md:top-1">
            <div className="space-y-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              {/* <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Walk-in checkout
              </p> */}
              <h1 className="ml-5 mt-1 text-2xl font-bold tracking-tight text-slate-900">
                Point of Sale
              </h1>

              {!isCompactLayout && (
                <p className="ml-5 text-sm text-slate-600">
                  Fast cart building for front-counter checkout.
                </p>
              )}

              <p className="ml-5 text-xs font-medium uppercase tracking-wide text-slate-500">
                Optimized for {runtimeProfile.runtimeMode}
              </p>

              <div
                className={`mt-1 grid gap-2 ${
                  isCompactLayout ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_220px]"
                }`}
              >
                <Input
                  autoFocus
                  ref={searchInputRef}
                  className="h-11 border-slate-200 bg-slate-50 text-base focus-visible:border-brand-500 focus-visible:ring-brand-100"
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
                <select
                  className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-500"
                  value={activeCategory}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all"
                        ? "All Items"
                        : categoryLabelByKey[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              {barcodeEnabled && showBarcodeScannerPanel && isCompactLayout ? (
                <Link
                  href="/scanner"
                  className="flex h-12 items-center justify-center rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Scan Item
                </Link>
              ) : null}

              {!isCompactLayout && (
                <button
                  type="button"
                  onClick={() => setShowScannerPanel((prev) => !prev)}
                  className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 transition hover:bg-brand-200"
                >
                  {showScannerPanel ? "Hide Scanner" : "Show Scanner"}
                </button>
              )}

              {barcodeEnabled &&
              showBarcodeScannerPanel &&
              showScannerPanel &&
              !isCompactLayout ? (
                <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${scannerStatusClassName}`}
                    >
                      {scannerStatus}
                    </div>
                  </div>

                  {showScannerPanel ? (
                    <BarcodeScannerPanel
                      modes={allowedScannerModes}
                      defaultMode={defaultScannerMode}
                      barcodeValue={barcodeInput}
                      onBarcodeValueChange={(value) => {
                        setBarcodeInput(value);
                        setSearch(value);
                      }}
                      onBarcodeSubmit={addProductByBarcode}
                      onServerFrameDecode={async (imageData) => {
                        try {
                          const result = await posService.decodeBarcodeFrame({
                            imageData,
                          });
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
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      Scanner controls are hidden.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <SimplebarScroll className="min-h-0 flex-1 pr-1">
            {productsQuery.isLoading ? (
              <div
                className={`grid gap-3 ${
                  isCompactLayout
                    ? "grid-cols-2"
                    : isTabletLayout
                      ? "grid-cols-3"
                      : "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                }`}
              >
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
              <div
                className={`grid gap-3 ${
                  isCompactLayout
                    ? "grid-cols-2"
                    : isTabletLayout
                      ? "grid-cols-3"
                      : "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                }`}
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    highlight={highlightProductId === product._id}
                    onQuickAdd={(pickedProduct) => {
                      addItem(pickedProduct);
                      triggerAddedFeedback(
                        pickedProduct.name,
                        pickedProduct._id,
                      );
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
          </SimplebarScroll>
        </section>

        <aside
          className={`${
            isCompactLayout ? "hidden" : "flex"
          } self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 h-full min-h-0 flex-col`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Current Cart
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {itemCount} items
            </span>
          </div>
          <SimplebarScroll className="mt-3 min-h-0 flex-1 pr-1" contentClassName="space-y-2">
            {items.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                Cart is empty.
              </p>
            ) : (
              items.map((item) => (
                <CartItem
                  key={item.lineKey}
                  item={item}
                  onIncrease={() =>
                    setQuantity(item.lineKey, item.quantity + 1)
                  }
                  onDecrease={() =>
                    setQuantity(item.lineKey, item.quantity - 1)
                  }
                  onRemove={() => removeItem(item.lineKey)}
                />
              ))
            )}
          </SimplebarScroll>

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

      {isCompactLayout ? (
        <CartBar
          itemCount={itemCount}
          total={total}
          onOpenCart={() => setCheckoutOpen(true)}
        />
      ) : null}

      {/* {isCompactLayout ? (
        <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-2xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="rounded-md bg-slate-700 px-3 py-2"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="rounded-md bg-brand-600 px-3 py-2 font-semibold"
          >
            Cart ({itemCount})
          </button>
          <Link href="/scanner" className="rounded-md bg-slate-700 px-3 py-2">
            Scan
          </Link>
        </nav>
      ) : null} */}

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
            <h3 className="text-lg font-semibold text-slate-900">
              {detailsProduct.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              PHP {detailsProduct.price.toFixed(2)} each
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Variant
              </label>
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
              <span className="text-sm font-medium text-slate-700">
                Quantity
              </span>
              <div className="inline-flex items-center rounded-full bg-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setDetailsQuantity((prev) => Math.max(1, prev - 1))
                  }
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
                    setDetailsQuantity((prev) =>
                      Math.min(prev + 1, detailsProduct.stock),
                    )
                  }
                  className="h-9 w-9 text-base font-bold text-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </label>
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
                  triggerAddedFeedback(
                    `${detailsProduct.name} (${detailsVariant})`,
                    detailsProduct._id,
                  );
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
