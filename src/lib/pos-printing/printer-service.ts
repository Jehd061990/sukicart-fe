import { POSRuntimeProfile } from "@/lib/pos-adaptive/types";
import {
  AirPrintAdapter,
  BluetoothPrintAdapter,
  BrowserPrintAdapter,
  FutureLocalBridgeAdapter,
} from "@/lib/pos-printing/adapters";
import {
  isAndroidBluetoothBridgeAvailable,
  isDesktopLocalBridgeAvailable,
} from "@/lib/pos-printing/bridge-contracts";
import {
  PrintContext,
  PrinterAdapter,
  PrinterAdapterType,
  PrintResult,
  ReceiptPayload,
} from "@/lib/pos-printing/types";

const ADAPTERS: PrinterAdapter[] = [
  BluetoothPrintAdapter,
  AirPrintAdapter,
  FutureLocalBridgeAdapter,
  BrowserPrintAdapter,
];

const ADAPTER_BY_TYPE: Record<PrinterAdapterType, PrinterAdapter> = {
  bluetooth: BluetoothPrintAdapter,
  airprint: AirPrintAdapter,
  "local-bridge": FutureLocalBridgeAdapter,
  browser: BrowserPrintAdapter,
};

const chooseAdapter = (context: PrintContext) => {
  if (context.preferredAdapter) {
    const preferred = ADAPTER_BY_TYPE[context.preferredAdapter];
    if (preferred && preferred.isSupported(context)) {
      return preferred;
    }
  }

  if (context.runtimeProfile.isAndroid && context.preferBluetooth) {
    return BluetoothPrintAdapter;
  }

  if (context.runtimeProfile.isIOS) {
    return AirPrintAdapter;
  }

  if (context.runtimeProfile.isDesktop) {
    if (FutureLocalBridgeAdapter.isSupported(context)) {
      return FutureLocalBridgeAdapter;
    }

    return BrowserPrintAdapter;
  }

  return ADAPTERS.find((adapter) => adapter.isSupported(context)) || BrowserPrintAdapter;
};

export const printerService = {
  getPreferredAdapter(
    profile: POSRuntimeProfile,
    preferBluetooth = true,
    preferredAdapter?: PrinterAdapterType,
  ): PrinterAdapterType {
    return chooseAdapter({ runtimeProfile: profile, preferBluetooth, preferredAdapter }).type;
  },

  async printReceipt(payload: ReceiptPayload, context: PrintContext): Promise<PrintResult> {
    const adapter = chooseAdapter(context);
    return adapter.printReceipt(payload, context);
  },

  async connectPrinter(context: PrintContext): Promise<PrintResult> {
    const adapter = chooseAdapter(context);

    if (adapter.connect) {
      return adapter.connect(context);
    }

    return {
      adapterType: adapter.type,
      status: "PRINT_SUCCESS",
      message: `${adapter.type} adapter is ready`,
      printedAt: new Date().toISOString(),
    };
  },

  getBridgeHealth(context: PrintContext) {
    const adapter = chooseAdapter(context);

    if (adapter.type === "local-bridge") {
      const available = isDesktopLocalBridgeAvailable();
      return {
        adapter: adapter.type,
        available,
        message: available ? "QZ Tray bridge detected" : "QZ Tray bridge not detected",
      };
    }

    if (adapter.type === "bluetooth") {
      const available = isAndroidBluetoothBridgeAvailable();
      return {
        adapter: adapter.type,
        available,
        message: available
          ? "Android Bluetooth bridge detected"
          : "Android Bluetooth bridge not detected",
      };
    }

    return {
      adapter: adapter.type,
      available: true,
      message: "Browser/AirPrint fallback ready",
    };
  },
};
