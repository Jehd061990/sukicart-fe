"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { posService } from "@/lib/api/services/pos.service";
import { usePOSDeviceProfile } from "@/hooks/pos/use-device-profile";
import { usePrinterManager } from "@/hooks/pos/use-printer-manager";
import {
  getAndroidBluetoothDiagnostics,
  isAndroidBluetoothBridgeAvailable,
} from "@/lib/pos-printing/bridge-contracts";
import { printerService } from "@/lib/pos-printing/printer-service";
import { ThermalPrinterDevice } from "@/lib/pos-printing/types";
import { useAuthStore } from "@/store/auth.store";

const normalizeMacAddress = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "")
    .slice(0, 12)
    .match(/.{1,2}/g)
    ?.join(":") || "";

const isValidMacAddress = (value: string) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value);

export default function POSPrinterModulePage() {
  const role = useAuthStore((state) => state.user?.role);
  const [isSavingPrinterDefault, setIsSavingPrinterDefault] = useState(false);
  const [manualPrinterMac, setManualPrinterMac] = useState("");
  const [isLoadingBluetoothDiagnostics, setIsLoadingBluetoothDiagnostics] = useState(false);
  const [printActionMessage, setPrintActionMessage] = useState<string | null>(null);
  const [bluetoothDiagnostics, setBluetoothDiagnostics] = useState<{
    isCapacitorNative: boolean;
    hasBridge: boolean;
    pluginName: string | null;
    methods: string[];
    permissionState: string;
    bluetoothEnabled: boolean | null;
  } | null>(null);

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
  const preferredPOSMode = storeConfigQuery.data?.store?.preferredPOSMode || "desktop";
  const receiptPrinterEnabled = printingConfig.receiptPrinterEnabled !== false;
  const runtimeProfile = usePOSDeviceProfile(preferredPOSMode);
  const hasNativeBluetoothBridge = isAndroidBluetoothBridgeAvailable();
  const preferNativeBluetooth = runtimeProfile.isAndroid || hasNativeBluetoothBridge;
  const effectivePrinterAdapter = preferNativeBluetooth
    ? "bluetooth"
    : preferredPrinterAdapter;

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

  const printerManager = usePrinterManager({
    context: {
      runtimeProfile,
      preferBluetooth: preferNativeBluetooth,
      preferredAdapter: effectivePrinterAdapter,
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

  const adapterLabel = useMemo(
    () => printerService.getPreferredAdapter(runtimeProfile, preferNativeBluetooth, effectivePrinterAdapter),
    [effectivePrinterAdapter, preferNativeBluetooth, runtimeProfile],
  );

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
    if (!runtimeProfile.isAndroid && !runtimeProfile.isPWA) {
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
  }, [runtimeProfile.isAndroid, runtimeProfile.isPWA]);

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

  const toggleReceiptPrinterEnabled = (enabled: boolean) => {
    if (!storeConfig) {
      return;
    }

    const run = async () => {
      setIsSavingPrinterDefault(true);
      try {
        await posService.updateStoreConfig({
          configOverrides: {
            printing: {
              ...storeConfig.printing,
              receiptPrinterEnabled: enabled,
            },
          },
        });

        await storeConfigQuery.refetch();
        setPrintActionMessage(
          enabled
            ? "Receipt printer enabled. Queue alerts and print actions are active."
            : "Receipt printer disabled. Queue alerts and print actions are paused.",
        );
      } catch (error) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to update receipt printer setting";
        setPrintActionMessage(message);
      } finally {
        setIsSavingPrinterDefault(false);
      }
    };

    void run();
  };

  if (role !== "POS") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="font-heading text-2xl font-semibold text-amber-900">POS Access Required</h1>
        <p className="mt-2 text-sm text-amber-800">
          Printer module is only available to POS cashier accounts.
        </p>
        <Link
          href="/pos"
          className="mt-4 inline-block rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Back to POS Dashboard
        </Link>
      </section>
    );
  }

  return (
    <div className="min-h-full bg-slate-100 p-3 md:p-4 overflow-y-auto max-h-dvh">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Runtime: <strong>{runtimeProfile.runtimeMode.toUpperCase()}</strong> | Input: {runtimeProfile.inputMethod}
            </span>
            <span>
              Printer: <strong>{adapterLabel}</strong>
            </span>
            <span>
              Active: <strong>{activeBluetoothPrinter?.name || "None"}</strong>
            </span>
          </div>
          {printActionMessage ? <p className="mt-1 text-xs text-amber-700">{printActionMessage}</p> : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-700">POS Printer Module</h1>
            <Link
              href="/pos"
              className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white"
            >
              Back to Store Operations
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Plugin Debug</p>
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
                  {!bluetoothDiagnostics.isCapacitorNative ? (
                    <p className="text-amber-700">
                      Native runtime is NO. Open this page inside the installed Android app, not mobile browser/PWA.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">Tap Refresh to inspect native plugin state.</p>
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
              <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:col-span-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Receipt Printer Available</span>
                  <p className="text-[11px] text-slate-500">
                    Disable if this POS terminal does not use a receipt printer.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={receiptPrinterEnabled}
                  disabled={isSavingPrinterDefault}
                  onChange={(event) => toggleReceiptPrinterEnabled(event.target.checked)}
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
        </div>
      </div>
    </div>
  );
}
