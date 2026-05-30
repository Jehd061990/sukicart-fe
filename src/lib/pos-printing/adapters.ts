import { openReceiptPrintWindow } from "@/lib/pos-printing/receipt-template";
import {
  connectAndroidBluetoothPrinter,
  connectDesktopLocalBridge,
  disconnectAndroidBluetoothPrinter,
  getAndroidBluetoothPrinterConnection,
  isAndroidBluetoothBridgeAvailable,
  isDesktopLocalBridgeAvailable,
  scanAndroidBluetoothPrinters,
  printThroughAndroidBluetoothBridge,
  printThroughDesktopLocalBridge,
} from "@/lib/pos-printing/bridge-contracts";
import {
  PrintContext,
  PrinterConnectionResult,
  PrinterAdapter,
  PrintResult,
  PrinterScanResult,
  ReceiptPayload,
} from "@/lib/pos-printing/types";

const success = (
  adapterType: PrintResult["adapterType"],
  message: string,
): PrintResult => ({
  adapterType,
  status: "PRINT_SUCCESS",
  message,
  printedAt: new Date().toISOString(),
});

const failure = (
  adapterType: PrintResult["adapterType"],
  status: PrintResult["status"],
  message: string,
): PrintResult => ({
  adapterType,
  status,
  message,
});

const connectionSuccess = (
  adapterType: PrinterConnectionResult["adapterType"],
  message: string,
): PrinterConnectionResult => ({
  adapterType,
  status: "CONNECTED",
  message,
});

const connectionFailure = (
  adapterType: PrinterConnectionResult["adapterType"],
  message: string,
): PrinterConnectionResult => ({
  adapterType,
  status: "FAILED",
  message,
});

const scanResponse = (
  adapterType: PrinterScanResult["adapterType"],
  message: string,
): PrinterScanResult => ({
  adapterType,
  message,
  printers: [],
});

export const BrowserPrintAdapter: PrinterAdapter = {
  type: "browser",
  isSupported: () => typeof window !== "undefined",
  connect: async () => connectionSuccess("browser", "Browser print adapter ready"),
  disconnect: async () => ({
    adapterType: "browser",
    status: "DISCONNECTED",
    message: "Browser print adapter disconnected",
  }),
  getConnectionStatus: async () => ({
    adapterType: "browser",
    status: "CONNECTED",
    message: "Browser print adapter ready",
  }),
  printReceipt: async (payload: ReceiptPayload) => {
    const opened = openReceiptPrintWindow(payload);
    if (!opened) {
      return failure("browser", "PRINT_FAILED", "Browser blocked print pop-up");
    }

    return success("browser", "Browser print dialog opened");
  },
};

export const BluetoothPrintAdapter: PrinterAdapter = {
  type: "bluetooth",
  isSupported: (context: PrintContext) =>
    context.runtimeProfile.isAndroid || isAndroidBluetoothBridgeAvailable(),
  scan: async (context: PrintContext) => {
    if (!context.runtimeProfile.isAndroid && !isAndroidBluetoothBridgeAvailable()) {
      return scanResponse("bluetooth", "Bluetooth scanning is Android-only");
    }

    try {
      const result = await scanAndroidBluetoothPrinters();
      return {
        adapterType: "bluetooth",
        printers: result.printers,
        message: result.message,
      };
    } catch (error) {
      return scanResponse("bluetooth", String(error));
    }
  },
  connect: async (context: PrintContext, printer) => {
    if (!context.runtimeProfile.isAndroid && !isAndroidBluetoothBridgeAvailable()) {
      return connectionFailure("bluetooth", "Bluetooth printing is Android-only");
    }

    if (!isAndroidBluetoothBridgeAvailable()) {
      return connectionFailure(
        "bluetooth",
        "Android Bluetooth bridge unavailable. Install Capacitor printer plugin.",
      );
    }

    try {
      const result = await connectAndroidBluetoothPrinter(printer || context.selectedPrinter);
      if (!result.ok) {
        return connectionFailure("bluetooth", result.message);
      }

      return connectionSuccess("bluetooth", result.message);
    } catch (error) {
      return connectionFailure("bluetooth", String(error));
    }
  },
  disconnect: async (context: PrintContext) => {
    if (!context.runtimeProfile.isAndroid && !isAndroidBluetoothBridgeAvailable()) {
      return {
        adapterType: "bluetooth",
        status: "DISCONNECTED",
        message: "Bluetooth adapter ignored outside Android",
      };
    }

    try {
      const result = await disconnectAndroidBluetoothPrinter();
      if (!result.ok) {
        return connectionFailure("bluetooth", result.message);
      }

      return {
        adapterType: "bluetooth",
        status: "DISCONNECTED",
        message: result.message,
      };
    } catch (error) {
      return connectionFailure("bluetooth", String(error));
    }
  },
  getConnectionStatus: async (context: PrintContext) => {
    if (!context.runtimeProfile.isAndroid && !isAndroidBluetoothBridgeAvailable()) {
      return {
        adapterType: "bluetooth",
        status: "DISCONNECTED",
        message: "Bluetooth printing is Android-only",
      };
    }

    try {
      const result = await getAndroidBluetoothPrinterConnection();
      if (!result.ok || !result.connected) {
        return {
          adapterType: "bluetooth",
          status: "DISCONNECTED",
          message: result.message,
          printer: result.printer || undefined,
        };
      }

      return {
        adapterType: "bluetooth",
        status: "CONNECTED",
        message: result.message,
        printer: result.printer || undefined,
      };
    } catch (error) {
      return connectionFailure("bluetooth", String(error));
    }
  },
  printReceipt: async (payload: ReceiptPayload, context: PrintContext) => {
    if (!context.runtimeProfile.isAndroid && !isAndroidBluetoothBridgeAvailable()) {
      return failure("bluetooth", "BLUETOOTH_DISCONNECTED", "Bluetooth printing is Android-only");
    }

    if (isAndroidBluetoothBridgeAvailable()) {
      try {
        const result = await printThroughAndroidBluetoothBridge(payload);
        if (result.ok) {
          return success("bluetooth", result.message);
        }

        return failure("bluetooth", "BLUETOOTH_DISCONNECTED", result.message);
      } catch (error) {
        return failure("bluetooth", "PRINT_FAILED", String(error));
      }
    }

    return failure(
      "bluetooth",
      "BLUETOOTH_DISCONNECTED",
      "Android Bluetooth bridge unavailable. Connect or install the printer bridge plugin.",
    );
  },
};

export const AirPrintAdapter: PrinterAdapter = {
  type: "airprint",
  isSupported: (context: PrintContext) => context.runtimeProfile.isIOS,
  connect: async (context: PrintContext) => {
    if (!context.runtimeProfile.isIOS) {
      return connectionFailure("airprint", "AirPrint supported only on iOS profile");
    }

    return connectionSuccess("airprint", "AirPrint will use iOS browser print dialog");
  },
  getConnectionStatus: async () =>
    connectionSuccess("airprint", "AirPrint will use iOS browser print dialog"),
  printReceipt: async (payload: ReceiptPayload, context: PrintContext) => {
    if (!context.runtimeProfile.isIOS) {
      return failure("airprint", "PRINT_FAILED", "AirPrint supported only on iOS profile");
    }

    const opened = openReceiptPrintWindow(payload);
    if (!opened) {
      return failure("airprint", "PRINT_FAILED", "AirPrint fallback window blocked");
    }

    return success("airprint", "AirPrint/browser print dialog opened");
  },
};

export const FutureLocalBridgeAdapter: PrinterAdapter = {
  type: "local-bridge",
  isSupported: (context: PrintContext) =>
    context.runtimeProfile.isDesktop && isDesktopLocalBridgeAvailable(),
  connect: async (context: PrintContext) => {
    if (!context.runtimeProfile.isDesktop) {
      return connectionFailure("local-bridge", "Local bridge is desktop-only");
    }

    if (!isDesktopLocalBridgeAvailable()) {
      return connectionFailure("local-bridge", "QZ Tray bridge not available");
    }

    try {
      const result = await connectDesktopLocalBridge();
      if (!result.ok) {
        return connectionFailure("local-bridge", result.message);
      }

      return connectionSuccess("local-bridge", result.message);
    } catch (error) {
      return connectionFailure("local-bridge", String(error));
    }
  },
  getConnectionStatus: async (context: PrintContext) => {
    if (!context.runtimeProfile.isDesktop) {
      return {
        adapterType: "local-bridge",
        status: "DISCONNECTED",
        message: "Local bridge is desktop-only",
      };
    }

    if (!isDesktopLocalBridgeAvailable()) {
      return {
        adapterType: "local-bridge",
        status: "DISCONNECTED",
        message: "QZ Tray bridge not available",
      };
    }

    return {
      adapterType: "local-bridge",
      status: "CONNECTED",
      message: "QZ Tray bridge detected",
    };
  },
  printReceipt: async (payload: ReceiptPayload, context: PrintContext) => {
    if (!isDesktopLocalBridgeAvailable()) {
      return failure("local-bridge", "PRINTER_OFFLINE", "QZ Tray bridge not available");
    }

    try {
      const result = await printThroughDesktopLocalBridge(payload, context.printerName);
      if (!result.ok) {
        return failure("local-bridge", "PRINT_FAILED", result.message);
      }

      return success("local-bridge", result.message);
    } catch (error) {
      return failure("local-bridge", "PRINT_FAILED", String(error));
    }
  },
};
