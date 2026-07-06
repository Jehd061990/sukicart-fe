"use client";

import { useCallback } from "react";
import { printerService } from "@/lib/pos-printing/printer-service";
import { PrintContext, ThermalPrinterDevice } from "@/lib/pos-printing/types";
import { usePrinterManagerStore } from "@/store/printer-manager.store";

interface UsePrinterManagerArgs {
  context: PrintContext;
}

export const usePrinterManager = ({ context }: UsePrinterManagerArgs) => {
  const discoveredPrinters = usePrinterManagerStore((state) => state.discoveredPrinters);
  const selectedPrinter = usePrinterManagerStore((state) => state.selectedPrinter);
  const connectionStatus = usePrinterManagerStore((state) => state.connectionStatus);
  const statusMessage = usePrinterManagerStore((state) => state.statusMessage);
  const paperSize = usePrinterManagerStore((state) => state.paperSize);
  const autoReconnect = usePrinterManagerStore((state) => state.autoReconnect);
  const isScanning = usePrinterManagerStore((state) => state.isScanning);
  const isConnecting = usePrinterManagerStore((state) => state.isConnecting);
  const setDiscoveredPrinters = usePrinterManagerStore((state) => state.setDiscoveredPrinters);
  const setSelectedPrinter = usePrinterManagerStore((state) => state.setSelectedPrinter);
  const setConnectionState = usePrinterManagerStore((state) => state.setConnectionState);
  const setPaperSize = usePrinterManagerStore((state) => state.setPaperSize);
  const setAutoReconnect = usePrinterManagerStore((state) => state.setAutoReconnect);
  const setScanning = usePrinterManagerStore((state) => state.setScanning);
  const setConnecting = usePrinterManagerStore((state) => state.setConnecting);
  const removeSavedPrinter = usePrinterManagerStore((state) => state.removeSavedPrinter);

  const resolvedContext: PrintContext = {
    ...context,
    selectedPrinter: context.selectedPrinter || selectedPrinter || undefined,
    printerSettings: {
      printerName: selectedPrinter?.name || "",
      printerMac: selectedPrinter?.macAddress || selectedPrinter?.id || "",
      connectionType: "bluetooth",
      paperSize,
      autoReconnect,
    },
  };

  const scanPrinters = useCallback(async () => {
    setScanning(true);
    try {
      const result = await printerService.scanPrinters(resolvedContext);
      const fallbackPrinters =
        result.printers.length === 0 && selectedPrinter ? [selectedPrinter] : result.printers;

      setDiscoveredPrinters(fallbackPrinters);
      setConnectionState("DISCONNECTED", result.message);
      return {
        ...result,
        printers: fallbackPrinters,
      };
    } finally {
      setScanning(false);
    }
  }, [resolvedContext, selectedPrinter, setConnectionState, setDiscoveredPrinters, setScanning]);

  const connectPrinter = useCallback(
    async (printer?: ThermalPrinterDevice) => {
      setConnecting(true);
      setConnectionState("CONNECTING", "Connecting printer...");
      try {
        const target = printer || selectedPrinter || undefined;
        const result = await printerService.connectPrinter(
          {
            ...resolvedContext,
            selectedPrinter: target,
          },
          target,
        );

        if (result.printer) {
          setSelectedPrinter(result.printer);
        } else if (target) {
          setSelectedPrinter(target);
        }

        setConnectionState(result.status, result.message);
        return result;
      } finally {
        setConnecting(false);
      }
    },
    [resolvedContext, selectedPrinter, setConnecting, setConnectionState, setSelectedPrinter],
  );

  const disconnectPrinter = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await printerService.disconnectPrinter(resolvedContext, selectedPrinter || undefined);
      setConnectionState(result.status, result.message);
      return result;
    } finally {
      setConnecting(false);
    }
  }, [resolvedContext, selectedPrinter, setConnecting, setConnectionState]);

  const checkConnection = useCallback(async () => {
    const result = await printerService.getConnectionStatus(resolvedContext, selectedPrinter || undefined);
    setConnectionState(result.status, result.message);
    if (result.printer) {
      setSelectedPrinter(result.printer);
    }
    return result;
  }, [resolvedContext, selectedPrinter, setConnectionState, setSelectedPrinter]);

  const reconnectSavedPrinter = useCallback(async () => {
    if (!autoReconnect || !selectedPrinter) {
      return null;
    }

    setConnecting(true);
    setConnectionState("CONNECTING", "Auto reconnecting saved printer...");
    try {
      const result = await printerService.autoReconnect(resolvedContext, selectedPrinter);
      setConnectionState(result.status, result.message);
      return result;
    } finally {
      setConnecting(false);
    }
  }, [autoReconnect, resolvedContext, selectedPrinter, setConnecting, setConnectionState]);

  const printTestReceipt = useCallback(async () => {
    const result = await printerService.printTestReceipt(resolvedContext);
    return result;
  }, [resolvedContext]);

  return {
    discoveredPrinters,
    selectedPrinter,
    connectionStatus,
    statusMessage,
    paperSize,
    autoReconnect,
    isScanning,
    isConnecting,
    setSelectedPrinter,
    setPaperSize,
    setAutoReconnect,
    removeSavedPrinter,
    scanPrinters,
    connectPrinter,
    disconnectPrinter,
    checkConnection,
    reconnectSavedPrinter,
    printTestReceipt,
  };
};
