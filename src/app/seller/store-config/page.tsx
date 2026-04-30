"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { posService } from "@/lib/api/services/pos.service";
import { ScannerMode, StoreType } from "@/types/store-config";

const SCANNER_MODES: ScannerMode[] = ["hardware", "camera", "manual"];

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

export default function SellerStoreConfigPage() {
  const [draft, setDraft] = useState<{
    storeType: StoreType;
    barcodeScanning: boolean;
    expiryTracking: boolean;
    prescriptionRequired: boolean;
    bulkQuantityInput: boolean;
    maxLineItems: number;
    scannerModes: ScannerMode[];
    defaultScannerMode: ScannerMode;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
    return {
      storeType: storeConfigQuery.data.store.storeType,
      barcodeScanning: Boolean(config.features.barcodeScanning),
      expiryTracking: Boolean(config.features.expiryTracking),
      prescriptionRequired: Boolean(config.features.prescriptionRequired),
      bulkQuantityInput: Boolean(config.features.bulkQuantityInput),
      maxLineItems: Number(config.businessRules.maxLineItems || 200),
      scannerModes: Array.isArray(config.uiBehavior.scannerModes)
        ? config.uiBehavior.scannerModes
        : ["manual"],
      defaultScannerMode: config.uiBehavior.defaultScannerMode || "manual",
    };
  }, [storeConfigQuery.data]);

  const form = draft || baseForm;

  const updateMutation = useMutation({
    mutationFn: () => {
      const scanner = ensureValidScannerMode(
        form?.scannerModes || ["manual"],
        form?.defaultScannerMode || "manual",
      );

      return posService.updateStoreConfig({
        storeType: form?.storeType,
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

      <Button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? "Saving..." : "Save Store Config"}
      </Button>
    </section>
  );
}
