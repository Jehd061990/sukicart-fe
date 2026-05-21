"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploadDropzone } from "@/components/uploads/ImageUploadDropzone";
import { posService } from "@/lib/api/services/pos.service";
import { usePOSDeviceProfile } from "@/hooks/pos/use-device-profile";
import { printerService } from "@/lib/pos-printing/printer-service";
import {
  CategoryThumbnailShape,
  PreferredPOSMode,
  ScannerMode,
  StorePrintingConfig,
  StoreCategoryImage,
  StoreCategoryKey,
  StoreType,
} from "@/types/store-config";

const SCANNER_MODES: ScannerMode[] = ["hardware", "camera", "manual"];
const CATEGORY_KEYS: StoreCategoryKey[] = ["vegetables", "meat", "fish"];
const CATEGORY_DEFAULT_LABELS: Record<StoreCategoryKey, string> = {
  vegetables: "Vegetables",
  meat: "Meat",
  fish: "Fish",
};

const normalizeCategoryCatalog = (
  input: Array<{
    key?: string;
    label?: string;
    image?: string;
    images?: StoreCategoryImage[];
  }> = [],
) =>
  CATEGORY_KEYS.map((key) => {
    const existing = input.find((entry) => entry?.key === key);
    const images = Array.isArray(existing?.images) ? existing.images : [];

    return {
      key,
      label: String(existing?.label || CATEGORY_DEFAULT_LABELS[key]),
      image: String(existing?.image || images[0]?.url || ""),
      images,
    };
  });

const ensureValidScannerMode = (
  selectedModes: ScannerMode[],
  defaultMode: ScannerMode,
) => {
  const deduped = Array.from(new Set(selectedModes));
  const safeModes = deduped.length > 0 ? deduped : ["manual"];

  if (safeModes.includes(defaultMode)) {
    return {
      modes: safeModes,
      defaultMode,
    };
  }

  return {
    modes: safeModes,
    defaultMode: safeModes[0],
  };
};

const STORE_TYPE_LABELS: Record<StoreType, string> = {
  grocery: "Grocery Store",
  pharmacy: "Pharmacy",
  hardware: "Hardware Store",
  convenience: "Convenience Store",
  retail: "General Retail",
};

const POS_MODE_OPTIONS: Array<{ label: string; value: PreferredPOSMode }> = [
  { label: "Desktop / Laptop", value: "desktop" },
  { label: "Android Phone / Tablet", value: "android" },
  { label: "iPhone / iPad", value: "ios" },
];

const PRINTER_ADAPTER_OPTIONS: Array<{
  label: string;
  value: NonNullable<StorePrintingConfig["preferredAdapter"]>;
}> = [
  { label: "Auto / Browser", value: "browser" },
  { label: "Desktop Local Bridge (QZ Tray)", value: "local-bridge" },
  { label: "Android Bluetooth", value: "bluetooth" },
  { label: "iOS AirPrint", value: "airprint" },
];

const getAllowedPrinterAdapters = (
  runtime: ReturnType<typeof usePOSDeviceProfile>,
): Array<NonNullable<StorePrintingConfig["preferredAdapter"]>> => {
  if (runtime.isAndroid) {
    return ["browser", "bluetooth"];
  }

  if (runtime.isIOS) {
    return ["browser", "airprint"];
  }

  if (runtime.isDesktop) {
    return ["browser", "local-bridge"];
  }

  return ["browser"];
};

type PrinterSectionKey =
  | "adapterProfile"
  | "bridgeHealth"
  | "setupChecklist"
  | "actions";

type PrinterSectionsState = Record<PrinterSectionKey, boolean>;

const DEFAULT_PRINTER_SECTION_STATE: PrinterSectionsState = {
  adapterProfile: true,
  bridgeHealth: true,
  setupChecklist: true,
  actions: true,
};

const getRuntimeDisableReason = (
  adapter: NonNullable<StorePrintingConfig["preferredAdapter"]>,
  runtime: ReturnType<typeof usePOSDeviceProfile>,
) => {
  if (adapter === "browser") {
    return "";
  }

  if (adapter === "local-bridge" && !runtime.isDesktop) {
    return "Desktop/Laptop runtime required";
  }

  if (adapter === "bluetooth" && !runtime.isAndroid) {
    return "Android runtime required";
  }

  if (adapter === "airprint" && !runtime.isIOS) {
    return "iOS runtime required";
  }

  return "";
};

export default function SellerStoreConfigPage() {
  const [draft, setDraft] = useState<{
    storeType: StoreType;
    preferredPOSMode: PreferredPOSMode;
    barcodeScanning: boolean;
    expiryTracking: boolean;
    prescriptionRequired: boolean;
    bulkQuantityInput: boolean;
    maxLineItems: number;
    scannerModes: ScannerMode[];
    defaultScannerMode: ScannerMode;
    categoryThumbnailShape: CategoryThumbnailShape;
    printerAdapter: NonNullable<StorePrintingConfig["preferredAdapter"]>;
    receiptPaperSize: NonNullable<StorePrintingConfig["paperSize"]>;
    autoPrintReceipts: boolean;
    desktopPrinterName: string;
    categoryCatalog: Array<{
      key: StoreCategoryKey;
      label: string;
      image: string;
      images: StoreCategoryImage[];
    }>;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [printerActionMessage, setPrinterActionMessage] = useState<string | null>(null);
  const [bridgeConnectSuccess, setBridgeConnectSuccess] = useState<boolean | null>(null);
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean | null>(null);
  const [printerSectionsOpen, setPrinterSectionsOpen] = useState<PrinterSectionsState>(
    DEFAULT_PRINTER_SECTION_STATE,
  );
  const desktopPrinterInputRef = useRef<HTMLInputElement | null>(null);
  const checklistHydratedKeyRef = useRef<string | null>(null);
  const sectionsHydratedKeyRef = useRef<string | null>(null);

  const queryClient = useQueryClient();

  const storeConfigQuery = useQuery({
    queryKey: ["store-config", "me"],
    queryFn: () => posService.getStoreConfig(),
  });

  const baseForm = useMemo(() => {
    if (!storeConfigQuery.data) {
      return null;
    }

    const config = storeConfigQuery.data.config;
    const printing = config.printing || {};
    return {
      storeType: storeConfigQuery.data.store.storeType,
      preferredPOSMode: storeConfigQuery.data.store.preferredPOSMode || "desktop",
      barcodeScanning: Boolean(config.features.barcodeScanning),
      expiryTracking: Boolean(config.features.expiryTracking),
      prescriptionRequired: Boolean(config.features.prescriptionRequired),
      bulkQuantityInput: Boolean(config.features.bulkQuantityInput),
      maxLineItems: Number(config.businessRules.maxLineItems || 200),
      scannerModes: Array.isArray(config.uiBehavior.scannerModes)
        ? config.uiBehavior.scannerModes
        : ["manual"],
      defaultScannerMode: config.uiBehavior.defaultScannerMode || "manual",
      categoryThumbnailShape:
        config.uiBehavior.categoryThumbnailShape === "circle"
          ? "circle"
          : "rounded",
      printerAdapter: printing.preferredAdapter || "browser",
      receiptPaperSize: printing.paperSize || "80mm",
      autoPrintReceipts: printing.autoPrint !== false,
      desktopPrinterName: String(printing.desktopPrinterName || ""),
      categoryCatalog: normalizeCategoryCatalog(config.uiBehavior.categoryCatalog),
    };
  }, [storeConfigQuery.data]);

  const form = draft || baseForm;
  const previewPreferredPOSMode =
    draft?.preferredPOSMode || storeConfigQuery.data?.store?.preferredPOSMode || "desktop";
  const runtimeProfile = usePOSDeviceProfile(previewPreferredPOSMode);
  const allowedPrinterAdapters = getAllowedPrinterAdapters(runtimeProfile);
  const checklistStorageKey = useMemo(() => {
    const storeId = storeConfigQuery.data?.store?.id;
    const adapter = form?.printerAdapter;

    if (!storeId || !adapter) {
      return null;
    }

    return `sukigo-printer-checklist:${storeId}:${adapter}`;
  }, [form?.printerAdapter, storeConfigQuery.data?.store?.id]);
  const sectionsStorageKey = useMemo(() => {
    const storeId = storeConfigQuery.data?.store?.id;
    if (!storeId) {
      return null;
    }

    return `sukigo-printer-sections:${storeId}`;
  }, [storeConfigQuery.data?.store?.id]);

  useEffect(() => {
    if (!checklistStorageKey || typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(checklistStorageKey);
    if (!raw) {
      setBridgeConnectSuccess(null);
      setTestPrintSuccess(null);
      checklistHydratedKeyRef.current = checklistStorageKey;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        bridgeConnectSuccess?: boolean | null;
        testPrintSuccess?: boolean | null;
      };

      setBridgeConnectSuccess(
        typeof parsed.bridgeConnectSuccess === "boolean"
          ? parsed.bridgeConnectSuccess
          : null,
      );
      setTestPrintSuccess(
        typeof parsed.testPrintSuccess === "boolean" ? parsed.testPrintSuccess : null,
      );
    } catch {
      setBridgeConnectSuccess(null);
      setTestPrintSuccess(null);
    }

    checklistHydratedKeyRef.current = checklistStorageKey;
  }, [checklistStorageKey]);

  useEffect(() => {
    if (!sectionsStorageKey || typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(sectionsStorageKey);
    if (!raw) {
      setPrinterSectionsOpen(DEFAULT_PRINTER_SECTION_STATE);
      sectionsHydratedKeyRef.current = sectionsStorageKey;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PrinterSectionsState>;
      setPrinterSectionsOpen({
        adapterProfile:
          typeof parsed.adapterProfile === "boolean"
            ? parsed.adapterProfile
            : DEFAULT_PRINTER_SECTION_STATE.adapterProfile,
        bridgeHealth:
          typeof parsed.bridgeHealth === "boolean"
            ? parsed.bridgeHealth
            : DEFAULT_PRINTER_SECTION_STATE.bridgeHealth,
        setupChecklist:
          typeof parsed.setupChecklist === "boolean"
            ? parsed.setupChecklist
            : DEFAULT_PRINTER_SECTION_STATE.setupChecklist,
        actions:
          typeof parsed.actions === "boolean"
            ? parsed.actions
            : DEFAULT_PRINTER_SECTION_STATE.actions,
      });
    } catch {
      setPrinterSectionsOpen(DEFAULT_PRINTER_SECTION_STATE);
    }

    sectionsHydratedKeyRef.current = sectionsStorageKey;
  }, [sectionsStorageKey]);

  useEffect(() => {
    if (!checklistStorageKey || typeof window === "undefined") {
      return;
    }

    if (checklistHydratedKeyRef.current !== checklistStorageKey) {
      return;
    }

    window.localStorage.setItem(
      checklistStorageKey,
      JSON.stringify({
        bridgeConnectSuccess,
        testPrintSuccess,
      }),
    );
  }, [bridgeConnectSuccess, checklistStorageKey, testPrintSuccess]);

  useEffect(() => {
    if (!sectionsStorageKey || typeof window === "undefined") {
      return;
    }

    if (sectionsHydratedKeyRef.current !== sectionsStorageKey) {
      return;
    }

    window.localStorage.setItem(sectionsStorageKey, JSON.stringify(printerSectionsOpen));
  }, [printerSectionsOpen, sectionsStorageKey]);

  useEffect(() => {
    if (!form) {
      return;
    }

    if (allowedPrinterAdapters.includes(form.printerAdapter)) {
      return;
    }

    const fallbackAdapter = allowedPrinterAdapters[0] || "browser";
    setDraft({
      ...form,
      printerAdapter: fallbackAdapter,
    });
  }, [allowedPrinterAdapters, form]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const scanner = ensureValidScannerMode(
        form?.scannerModes || ["manual"],
        form?.defaultScannerMode || "manual",
      );

      return posService.updateStoreConfig({
        storeType: form?.storeType,
        preferredPOSMode: form?.preferredPOSMode,
        configOverrides: {
          features: {
            barcodeScanning: Boolean(form?.barcodeScanning),
            expiryTracking: Boolean(form?.expiryTracking),
            prescriptionRequired: Boolean(form?.prescriptionRequired),
            bulkQuantityInput: Boolean(form?.bulkQuantityInput),
          },
          businessRules: {
            maxLineItems: Number(form?.maxLineItems || 200),
            paymentMethods: ["cash"],
          },
          uiBehavior: {
            showPrescriptionInput: Boolean(form?.prescriptionRequired),
            showBarcodeScanner: Boolean(form?.barcodeScanning),
            showBulkQuantityActions: Boolean(form?.bulkQuantityInput),
            scannerModes: scanner.modes,
            defaultScannerMode: scanner.defaultMode,
            categoryThumbnailShape: form?.categoryThumbnailShape || "rounded",
            categoryCatalog: (form?.categoryCatalog || []).map((entry) => ({
              key: entry.key,
              label: String(entry.label || CATEGORY_DEFAULT_LABELS[entry.key]).trim(),
              image: String(entry.image || entry.images?.[0]?.url || ""),
              images: Array.isArray(entry.images) ? entry.images : [],
            })),
          },
          printing: {
            preferredAdapter: form?.printerAdapter || "browser",
            paperSize: form?.receiptPaperSize || "80mm",
            autoPrint: Boolean(form?.autoPrintReceipts),
            desktopPrinterName: String(form?.desktopPrinterName || "").trim(),
          },
        },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["store-config", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      setStatusMessage("Store configuration saved.");
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to update store configuration";
      setStatusMessage(message);
    },
  });

  const enabledModules = useMemo(() => {
    if (!storeConfigQuery.data?.config?.modules) {
      return [];
    }

    return storeConfigQuery.data.config.modules;
  }, [storeConfigQuery.data]);

  if (storeConfigQuery.isLoading) {
    return <div className="rounded-xl border bg-card p-4">Loading store config...</div>;
  }

  if (storeConfigQuery.isError || !storeConfigQuery.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load store configuration.
      </div>
    );
  }

  if (!form) {
    return null;
  }

  const updateDraft = (next: Partial<typeof form>) => {
    setDraft({
      ...form,
      ...next,
    });
  };

  const toggleScannerMode = (mode: ScannerMode, checked: boolean) => {
    const nextModes = checked
      ? [...form.scannerModes, mode]
      : form.scannerModes.filter((item) => item !== mode);

    const scanner = ensureValidScannerMode(nextModes, form.defaultScannerMode);
    updateDraft({
      scannerModes: scanner.modes,
      defaultScannerMode: scanner.defaultMode,
    });
  };

  const updateCategoryCatalog = (
    key: StoreCategoryKey,
    next: Partial<{
      label: string;
      image: string;
      images: StoreCategoryImage[];
    }>,
  ) => {
    updateDraft({
      categoryCatalog: form.categoryCatalog.map((entry) => {
        if (entry.key !== key) {
          return entry;
        }

        return {
          ...entry,
          ...next,
        };
      }),
    });
  };

  const connectPrinterBridge = async () => {
    const result = await printerService.connectPrinter({
      runtimeProfile,
      preferredAdapter: form.printerAdapter,
      preferBluetooth: form.printerAdapter === "bluetooth",
      printerName: form.desktopPrinterName.trim() || undefined,
    });

    setPrinterActionMessage(`${result.status}: ${result.message}`);
    setBridgeConnectSuccess(result.status === "PRINT_SUCCESS");
  };

  const runFixIt = async (adapter: NonNullable<StorePrintingConfig["preferredAdapter"]>) => {
    updateDraft({ printerAdapter: adapter });

    if (adapter === "local-bridge") {
      if (!form.desktopPrinterName.trim()) {
        desktopPrinterInputRef.current?.focus();
        setPrinterActionMessage("Set desktop printer name, then click Connect Bridge.");
        return;
      }

      await connectPrinterBridge();
      return;
    }

    if (adapter === "bluetooth" || adapter === "airprint") {
      await connectPrinterBridge();
      return;
    }

    setPrinterActionMessage("Browser fallback is ready. Use Test Print to verify output.");
  };

  const testPrint = async () => {
    const result = await printerService.printReceipt(
      {
        receiptId: `test-${Date.now()}`,
        orderId: "TEST-PRINT",
        createdAt: new Date().toISOString(),
        sellerName: storeConfigQuery.data?.store.name || "SukiGo",
        cashierName: "Seller Admin",
        deviceName: runtimeProfile.runtimeMode.toUpperCase(),
        paperSize: form.receiptPaperSize,
        items: [
          { name: "Sample Item", quantity: 1, price: 1 },
          { name: "Printer Calibration", quantity: 1, price: 0 },
        ],
        subtotal: 1,
        discount: 0,
        total: 1,
      },
      {
        runtimeProfile,
        preferredAdapter: form.printerAdapter,
        preferBluetooth: form.printerAdapter === "bluetooth",
        printerName: form.desktopPrinterName.trim() || undefined,
      },
    );

    setPrinterActionMessage(`${result.status}: ${result.message}`);
    setTestPrintSuccess(result.status === "PRINT_SUCCESS");
  };

  const resetChecklistProgress = () => {
    setBridgeConnectSuccess(null);
    setTestPrintSuccess(null);
    setPrinterActionMessage("Checklist progress reset for this adapter.");

    if (checklistStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(checklistStorageKey);
    }
  };

  const togglePrinterSection = (section: PrinterSectionKey, nextOpen: boolean) => {
    setPrinterSectionsOpen((current) => ({
      ...current,
      [section]: nextOpen,
    }));
  };

  const setAllPrinterSections = (open: boolean) => {
    setPrinterSectionsOpen({
      adapterProfile: open,
      bridgeHealth: open,
      setupChecklist: open,
      actions: open,
    });
  };

  const bridgeHealth = printerService.getBridgeHealth({
    runtimeProfile,
    preferredAdapter: form.printerAdapter,
    preferBluetooth: form.printerAdapter === "bluetooth",
    printerName: form.desktopPrinterName.trim() || undefined,
  });

  const adapterDiagnostics = useMemo(
    () =>
      PRINTER_ADAPTER_OPTIONS.map((option) => {
        const runtimeReason = getRuntimeDisableReason(option.value, runtimeProfile);
        const runtimeAllowed = !runtimeReason;

        const health = printerService.getBridgeHealth({
          runtimeProfile,
          preferredAdapter: option.value,
          preferBluetooth: option.value === "bluetooth",
          printerName: form.desktopPrinterName.trim() || undefined,
        });

        const available = runtimeAllowed && health.available;
        const reason = !runtimeAllowed ? runtimeReason : !health.available ? health.message : "Ready";

        return {
          ...option,
          runtimeAllowed,
          available,
          reason,
        };
      }),
    [form.desktopPrinterName, runtimeProfile],
  );

  const setupChecklist =
    form.printerAdapter === "local-bridge"
      ? [
          {
            text: "Install QZ Tray on the cashier desktop/laptop.",
            status: "done" as const,
          },
          {
            text: "Open QZ Tray and allow this POS web origin.",
            status: bridgeHealth.available ? ("done" as const) : ("pending" as const),
          },
          {
            text: "Set desktop printer name in this settings page.",
            status: form.desktopPrinterName.trim() ? ("done" as const) : ("pending" as const),
          },
          {
            text: "Click Connect Bridge then run Test Print.",
            status:
              bridgeConnectSuccess === false || testPrintSuccess === false
                ? ("needs-attention" as const)
                : bridgeConnectSuccess && testPrintSuccess
                  ? ("done" as const)
                  : ("pending" as const),
          },
        ]
      : form.printerAdapter === "bluetooth"
        ? [
            {
              text: "Install Android app build with Bluetooth printer plugin.",
              status: bridgeHealth.available ? ("done" as const) : ("pending" as const),
            },
            {
              text: "Pair thermal printer from Android Bluetooth settings.",
              status: "pending" as const,
            },
            {
              text: "Open POS in app/PWA and tap Connect Bridge.",
              status:
                bridgeConnectSuccess === true
                  ? ("done" as const)
                  : bridgeConnectSuccess === false
                    ? ("needs-attention" as const)
                    : ("pending" as const),
            },
            {
              text: "Run Test Print and keep paper width aligned to selected size.",
              status:
                testPrintSuccess === true
                  ? ("done" as const)
                  : testPrintSuccess === false
                    ? ("needs-attention" as const)
                    : ("pending" as const),
            },
          ]
        : form.printerAdapter === "airprint"
          ? [
              {
                text: "Ensure iPhone/iPad and AirPrint printer are on same Wi-Fi.",
                status: "pending" as const,
              },
              {
                text: "Open POS on Safari or installed iOS web app.",
                status: "done" as const,
              },
              {
                text: "Use Test Print to open AirPrint sheet.",
                status:
                  testPrintSuccess === true
                    ? ("done" as const)
                    : testPrintSuccess === false
                      ? ("needs-attention" as const)
                      : ("pending" as const),
              },
              {
                text: "Confirm printer, copies, and paper size in iOS print dialog.",
                status: "pending" as const,
              },
            ]
          : [
              {
                text: "Browser fallback uses native print dialog.",
                status: "done" as const,
              },
              {
                text: "Use Test Print to verify output and margins.",
                status:
                  testPrintSuccess === true
                    ? ("done" as const)
                    : testPrintSuccess === false
                      ? ("needs-attention" as const)
                      : ("pending" as const),
              },
              {
                text: "Choose Save as PDF if printer is temporarily unavailable.",
                status: "pending" as const,
              },
            ];

  const checklistStatusClass = (status: "pending" | "done" | "needs-attention") => {
    if (status === "done") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "needs-attention") {
      return "bg-rose-100 text-rose-700";
    }

    return "bg-slate-200 text-slate-700";
  };

  const checklistStatusLabel = (status: "pending" | "done" | "needs-attention") => {
    if (status === "done") {
      return "Done";
    }

    if (status === "needs-attention") {
      return "Needs Attention";
    }

    return "Pending";
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold text-brand-900">
          Store Configuration
        </h1>
        <p className="mt-1 text-sm text-gray-700">
          Control POS behavior per tenant without hardcoding screens.
        </p>
      </div>

      {statusMessage ? (
        <div className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-gray-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Store Type</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Base modules and defaults are derived from this type.
          </p>

          <label className="mb-2 block text-sm font-medium">Type</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.storeType}
            onChange={(event) => {
              updateDraft({ storeType: event.target.value as StoreType });
            }}
          >
            {storeConfigQuery.data.supportedStoreTypes.map((type) => (
              <option key={type} value={type}>
                {STORE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          <label className="mt-4 mb-2 block text-sm font-medium">Max POS line items</label>
          <Input
            type="number"
            min={1}
            max={500}
            value={String(form.maxLineItems)}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              updateDraft({
                maxLineItems: Number.isFinite(parsed) ? parsed : 200,
              });
            }}
          />

          <label className="mt-4 mb-2 block text-sm font-medium">Preferred POS Device Mode</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.preferredPOSMode}
            onChange={(event) => {
              updateDraft({ preferredPOSMode: event.target.value as PreferredPOSMode });
            }}
          >
            {POS_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </article>

        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Toggle UX and business-rule behavior used by POS screens.
          </p>

          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between gap-3 rounded-md border p-2">
              <span>Barcode scanning</span>
              <input
                type="checkbox"
                checked={form.barcodeScanning}
                onChange={(event) =>
                  updateDraft({ barcodeScanning: event.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border p-2">
              <span>Expiry tracking</span>
              <input
                type="checkbox"
                checked={form.expiryTracking}
                onChange={(event) =>
                  updateDraft({ expiryTracking: event.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border p-2">
              <span>Prescription required</span>
              <input
                type="checkbox"
                checked={form.prescriptionRequired}
                onChange={(event) =>
                  updateDraft({ prescriptionRequired: event.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border p-2">
              <span>Bulk quantity input</span>
              <input
                type="checkbox"
                checked={form.bulkQuantityInput}
                onChange={(event) =>
                  updateDraft({ bulkQuantityInput: event.target.checked })
                }
              />
            </label>
          </div>
        </article>
      </div>

      <article className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Enabled Modules</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {enabledModules.map((moduleName) => (
            <span
              key={moduleName}
              className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700"
            >
              {moduleName}
            </span>
          ))}
        </div>
      </article>

      <article className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Scanner Modes</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Choose which scanner modes are available on POS and which mode opens first.
        </p>

        <div className="space-y-2 text-sm">
          {SCANNER_MODES.map((mode) => (
            <label
              key={mode}
              className="flex items-center justify-between gap-3 rounded-md border p-2"
            >
              <span className="capitalize">{mode} mode</span>
              <input
                type="checkbox"
                checked={form.scannerModes.includes(mode)}
                onChange={(event) => toggleScannerMode(mode, event.target.checked)}
              />
            </label>
          ))}
        </div>

        <label className="mt-4 mb-2 block text-sm font-medium">Default scanner mode</label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={form.defaultScannerMode}
          onChange={(event) =>
            updateDraft({
              defaultScannerMode: event.target.value as ScannerMode,
            })
          }
        >
          {form.scannerModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </option>
          ))}
        </select>
      </article>

      <article className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Category Thumbnail Style</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Choose how category thumbnail chips appear in POS tabs and side menu.
        </p>

        <label className="mb-2 block text-sm font-medium">Shape</label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={form.categoryThumbnailShape}
          onChange={(event) =>
            updateDraft({
              categoryThumbnailShape: event.target.value as CategoryThumbnailShape,
            })
          }
        >
          <option value="rounded">Rounded square</option>
          <option value="circle">Circle</option>
        </select>
      </article>

      <article className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Printer Setup</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Configure printer adapter, receipt size, and bridge options for adaptive POS printing.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setAllPrinterSections(true)}>
            Expand All
          </Button>
          <Button type="button" variant="outline" onClick={() => setAllPrinterSections(false)}>
            Collapse All
          </Button>
        </div>

        <details
          open={printerSectionsOpen.adapterProfile}
          onToggle={(event) =>
            togglePrinterSection(
              "adapterProfile",
              (event.currentTarget as HTMLDetailsElement).open,
            )
          }
          className="rounded-md border border-slate-200 bg-white p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Adapter & Receipt Profile</summary>
          <div className="mt-3 space-y-3">
            <label className="mb-2 block text-sm font-medium">Preferred Printer Adapter</label>
            <div className="space-y-2">
              {adapterDiagnostics.map((option) => {
                const selected = form.printerAdapter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!option.runtimeAllowed}
                    onClick={() => updateDraft({ printerAdapter: option.value })}
                    className={`w-full rounded-md border p-2 text-left text-sm ${
                      selected
                        ? "border-brand-500 bg-brand-50"
                        : option.runtimeAllowed
                          ? "border-slate-200 bg-white"
                          : "cursor-not-allowed border-slate-200 bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{option.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          option.available
                            ? "bg-emerald-100 text-emerald-700"
                            : option.runtimeAllowed
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {option.available
                          ? "Available"
                          : option.runtimeAllowed
                            ? "Needs Setup"
                            : "Unsupported"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{option.reason}</p>
                    {option.runtimeAllowed && !option.available ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void runFixIt(option.value);
                          }}
                          className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white"
                        >
                          Fix It
                        </button>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Runtime profile: {runtimeProfile.runtimeMode}. Unsupported adapters are disabled with reason.
            </p>

            <label className="mb-2 block text-sm font-medium">Receipt Paper Size</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.receiptPaperSize}
              onChange={(event) =>
                updateDraft({
                  receiptPaperSize: event.target.value as NonNullable<StorePrintingConfig["paperSize"]>,
                })
              }
            >
              <option value="58mm">58mm thermal</option>
              <option value="80mm">80mm thermal</option>
            </select>

            <label className="mb-2 block text-sm font-medium">Desktop Printer Name (optional)</label>
            <Input
              ref={desktopPrinterInputRef}
              value={form.desktopPrinterName}
              onChange={(event) => updateDraft({ desktopPrinterName: event.target.value })}
              placeholder="e.g. EPSON TM-T82"
            />

            <label className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
              <span>Auto print receipt after checkout</span>
              <input
                type="checkbox"
                checked={form.autoPrintReceipts}
                onChange={(event) => updateDraft({ autoPrintReceipts: event.target.checked })}
              />
            </label>
          </div>
        </details>

        <details
          open={printerSectionsOpen.bridgeHealth}
          onToggle={(event) =>
            togglePrinterSection(
              "bridgeHealth",
              (event.currentTarget as HTMLDetailsElement).open,
            )
          }
          className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Bridge Health</summary>
          <div className="mt-3 text-xs text-slate-700">
            <p>
              Runtime mode: <strong>{runtimeProfile.runtimeMode}</strong>
            </p>
            <p>
              Bridge health: <strong>{bridgeHealth.available ? "Available" : "Unavailable"}</strong>
            </p>
            <p>{bridgeHealth.message}</p>
            {printerActionMessage ? <p className="mt-2 text-slate-600">{printerActionMessage}</p> : null}
          </div>
        </details>

        <details
          open={printerSectionsOpen.setupChecklist}
          onToggle={(event) =>
            togglePrinterSection(
              "setupChecklist",
              (event.currentTarget as HTMLDetailsElement).open,
            )
          }
          className="mt-3 rounded-md border border-slate-200 bg-white p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Setup Checklist</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs text-slate-700">
            {setupChecklist.map((step) => (
              <li key={step.text} className="flex items-start justify-between gap-2">
                <span>{step.text}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${checklistStatusClass(step.status)}`}
                >
                  {checklistStatusLabel(step.status)}
                </span>
              </li>
            ))}
          </ol>
        </details>

        <details
          open={printerSectionsOpen.actions}
          onToggle={(event) =>
            togglePrinterSection(
              "actions",
              (event.currentTarget as HTMLDetailsElement).open,
            )
          }
          className="mt-3 rounded-md border border-slate-200 bg-white p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Actions</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void connectPrinterBridge()}>
              Connect Bridge
            </Button>
            <Button type="button" variant="outline" onClick={() => void testPrint()}>
              Test Print
            </Button>
            <Button type="button" variant="outline" onClick={resetChecklistProgress}>
              Reset Checklist Progress
            </Button>
          </div>
        </details>
      </article>

      <article className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Category Images</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Upload one optimized image per category for POS and inventory visuals.
        </p>

        <div className="space-y-4">
          {form.categoryCatalog.map((entry) => (
            <div key={entry.key} className="rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold capitalize">{entry.key}</p>
                <Input
                  className="max-w-xs"
                  value={entry.label}
                  onChange={(event) =>
                    updateCategoryCatalog(entry.key, { label: event.target.value })
                  }
                  placeholder="Category label"
                />
              </div>

              <ImageUploadDropzone
                value={entry.images}
                onChange={(nextImages) =>
                  updateCategoryCatalog(entry.key, {
                    images: nextImages.slice(0, 1),
                    image: nextImages[0]?.url || "",
                  })
                }
                folder={`sukigo/categories/${entry.key}`}
                maxFiles={1}
                previewShape={form.categoryThumbnailShape}
              />
            </div>
          ))}
        </div>
      </article>

      <Button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save Store Config"}
      </Button>
    </section>
  );
}
