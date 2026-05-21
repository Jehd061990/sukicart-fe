import { openReceiptPrintWindow } from "@/lib/pos-printing/receipt-template";
import {
  connectAndroidBluetoothBridge,
  connectDesktopLocalBridge,
  isAndroidBluetoothBridgeAvailable,
  isDesktopLocalBridgeAvailable,
  printThroughAndroidBluetoothBridge,
  printThroughDesktopLocalBridge,
} from "@/lib/pos-printing/bridge-contracts";
import {
  PrintContext,
  PrinterAdapter,
  PrintResult,
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

export const BrowserPrintAdapter: PrinterAdapter = {
  type: "browser",
  isSupported: () => typeof window !== "undefined",
  connect: async () => success("browser", "Browser print adapter ready"),
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
  isSupported: (context: PrintContext) => context.runtimeProfile.isAndroid,
  connect: async (context: PrintContext) => {
    if (!context.runtimeProfile.isAndroid) {
      return failure("bluetooth", "BLUETOOTH_DISCONNECTED", "Bluetooth printing is Android-only");
    }

    if (!isAndroidBluetoothBridgeAvailable()) {
      return failure(
        "bluetooth",
        "BLUETOOTH_DISCONNECTED",
        "Android Bluetooth bridge unavailable. Install Capacitor printer plugin.",
      );
    }

    try {
      const result = await connectAndroidBluetoothBridge();
      if (!result.ok) {
        return failure("bluetooth", "BLUETOOTH_DISCONNECTED", result.message);
      }

      return success("bluetooth", result.message);
    } catch (error) {
      return failure("bluetooth", "BLUETOOTH_DISCONNECTED", String(error));
    }
  },
  printReceipt: async (payload: ReceiptPayload, context: PrintContext) => {
    if (!context.runtimeProfile.isAndroid) {
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

    const opened = openReceiptPrintWindow(payload);
    if (!opened) {
      return failure("bluetooth", "PRINT_FAILED", "Bluetooth fallback print window blocked");
    }

    return success("bluetooth", "Queued to Bluetooth adapter fallback");
  },
};

export const AirPrintAdapter: PrinterAdapter = {
  type: "airprint",
  isSupported: (context: PrintContext) => context.runtimeProfile.isIOS,
  connect: async (context: PrintContext) => {
    if (!context.runtimeProfile.isIOS) {
      return failure("airprint", "PRINT_FAILED", "AirPrint supported only on iOS profile");
    }

    return success("airprint", "AirPrint will use iOS browser print dialog");
  },
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
      return failure("local-bridge", "PRINTER_OFFLINE", "Local bridge is desktop-only");
    }

    if (!isDesktopLocalBridgeAvailable()) {
      return failure("local-bridge", "PRINTER_OFFLINE", "QZ Tray bridge not available");
    }

    try {
      const result = await connectDesktopLocalBridge();
      if (!result.ok) {
        return failure("local-bridge", "PRINTER_OFFLINE", result.message);
      }

      return success("local-bridge", result.message);
    } catch (error) {
      return failure("local-bridge", "PRINT_FAILED", String(error));
    }
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
