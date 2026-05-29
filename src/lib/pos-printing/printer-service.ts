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
  PrinterConnectionResult,
  PrintResult,
  ReceiptPayload,
  ThermalPrinterDevice,
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

const resolveAdapterPipeline = (context: PrintContext) => {
  const requested: PrinterAdapter[] = [];

  if (context.preferredAdapter) {
    const preferred = ADAPTER_BY_TYPE[context.preferredAdapter];
    if (preferred) {
      requested.push(preferred);
    }
  }

  if (context.runtimeProfile.isAndroid && context.preferBluetooth) {
    requested.push(BluetoothPrintAdapter);
  }

  if (context.runtimeProfile.isIOS) {
    requested.push(AirPrintAdapter);
  }

  if (context.runtimeProfile.isDesktop) {
    requested.push(FutureLocalBridgeAdapter);
    requested.push(BrowserPrintAdapter);
  }

  requested.push(...ADAPTERS);

  const deduped = requested.filter(
    (adapter, index, arr) => arr.findIndex((entry) => entry.type === adapter.type) === index,
  );

  const supported = deduped.filter((adapter) => adapter.isSupported(context));
  const primary = supported[0] || BrowserPrintAdapter;
  const fallback = supported.slice(1);

  return {
    primary,
    fallback,
  };
};

const chooseAdapter = (context: PrintContext) => {
  return resolveAdapterPipeline(context).primary;
};

export const printerService = {
  getAdapterPipeline(context: PrintContext): Array<PrinterAdapterType> {
    const pipeline = resolveAdapterPipeline(context);
    return [pipeline.primary.type, ...pipeline.fallback.map((adapter) => adapter.type)];
  },

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

  async printTestReceipt(context: PrintContext): Promise<PrintResult> {
    const timestamp = new Date();
    return this.printReceipt(
      {
        receiptId: `test-${timestamp.getTime()}`,
        orderId: "TEST-RECEIPT",
        createdAt: timestamp.toISOString(),
        sellerName: "SukiGo POS",
        cashierName: "System",
        deviceName: context.runtimeProfile.runtimeMode.toUpperCase(),
        paperSize: context.printerSettings?.paperSize || "58mm",
        items: [
          { name: "Printer handshake", quantity: 1, price: 0 },
          { name: "ESC/POS sample", quantity: 1, price: 0 },
        ],
        subtotal: 0,
        discount: 0,
        total: 0,
        paymentMethod: "Test",
        qrCodeValue: `SukiGo:${timestamp.toISOString()}`,
        footerText: `Printer check ${timestamp.toLocaleString()}`,
      },
      context,
    );
  },

  async scanPrinters(context: PrintContext) {
    const adapter = chooseAdapter(context);
    if (!adapter.scan) {
      return {
        adapterType: adapter.type,
        printers: [],
        message: `${adapter.type} adapter does not support scanning`,
      };
    }

    return adapter.scan(context);
  },

  async connectPrinter(
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ): Promise<PrinterConnectionResult> {
    const adapter = chooseAdapter(context);

    if (adapter.connect) {
      return adapter.connect(context, printer);
    }

    return {
      adapterType: adapter.type,
      status: "CONNECTED",
      message: `${adapter.type} adapter is ready`,
    };
  },

  async disconnectPrinter(
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ): Promise<PrinterConnectionResult> {
    const adapter = chooseAdapter(context);

    if (adapter.disconnect) {
      return adapter.disconnect(context, printer);
    }

    return {
      adapterType: adapter.type,
      status: "DISCONNECTED",
      message: `${adapter.type} adapter disconnected`,
    };
  },

  async getConnectionStatus(
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ): Promise<PrinterConnectionResult> {
    const adapter = chooseAdapter(context);

    if (adapter.getConnectionStatus) {
      return adapter.getConnectionStatus(context, printer);
    }

    return {
      adapterType: adapter.type,
      status: "CONNECTED",
      message: `${adapter.type} adapter ready`,
    };
  },

  async autoReconnect(
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ): Promise<PrinterConnectionResult> {
    const status = await this.getConnectionStatus(context, printer);
    if (status.status === "CONNECTED") {
      return status;
    }

    return this.connectPrinter(context, printer);
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
