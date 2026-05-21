import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PrinterConnectionStatus,
  ReceiptPaperSize,
  ThermalPrinterDevice,
} from "@/lib/pos-printing/types";

interface PrinterManagerState {
  discoveredPrinters: ThermalPrinterDevice[];
  selectedPrinter: ThermalPrinterDevice | null;
  connectionStatus: PrinterConnectionStatus;
  statusMessage: string;
  paperSize: ReceiptPaperSize;
  autoReconnect: boolean;
  isScanning: boolean;
  isConnecting: boolean;
  setDiscoveredPrinters: (printers: ThermalPrinterDevice[]) => void;
  setSelectedPrinter: (printer: ThermalPrinterDevice | null) => void;
  setConnectionState: (status: PrinterConnectionStatus, message: string) => void;
  setPaperSize: (paperSize: ReceiptPaperSize) => void;
  setAutoReconnect: (enabled: boolean) => void;
  setScanning: (value: boolean) => void;
  setConnecting: (value: boolean) => void;
  removeSavedPrinter: () => void;
}

export const usePrinterManagerStore = create<PrinterManagerState>()(
  persist(
    (set) => ({
      discoveredPrinters: [],
      selectedPrinter: null,
      connectionStatus: "DISCONNECTED",
      statusMessage: "No printer selected",
      paperSize: "58mm",
      autoReconnect: true,
      isScanning: false,
      isConnecting: false,
      setDiscoveredPrinters: (printers) =>
        set((state) => {
          const selected = state.selectedPrinter;
          const selectedFromScan = selected
            ? printers.find((entry) => entry.id === selected.id || entry.macAddress === selected.macAddress)
            : null;

          return {
            discoveredPrinters: printers,
            selectedPrinter: selectedFromScan || selected,
          };
        }),
      setSelectedPrinter: (printer) => set({ selectedPrinter: printer }),
      setConnectionState: (status, message) =>
        set({
          connectionStatus: status,
          statusMessage: message,
        }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setAutoReconnect: (enabled) => set({ autoReconnect: enabled }),
      setScanning: (value) => set({ isScanning: value }),
      setConnecting: (value) => set({ isConnecting: value }),
      removeSavedPrinter: () =>
        set({
          selectedPrinter: null,
          connectionStatus: "DISCONNECTED",
          statusMessage: "Saved printer removed",
        }),
    }),
    {
      name: "sukigo-printer-manager",
      partialize: (state) => ({
        selectedPrinter: state.selectedPrinter,
        paperSize: state.paperSize,
        autoReconnect: state.autoReconnect,
        connectionStatus: state.connectionStatus,
        statusMessage: state.statusMessage,
      }),
    },
  ),
);
