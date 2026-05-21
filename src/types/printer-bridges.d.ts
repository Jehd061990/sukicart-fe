import { ReceiptPayload } from "@/lib/pos-printing/types";

declare global {
  interface QZBridge {
    websocket: {
      isActive: () => boolean;
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
    };
    printers: {
      getDefault: () => Promise<string>;
      find: (query?: string) => Promise<string>;
    };
    configs: {
      create: (printer: string, options?: Record<string, unknown>) => unknown;
    };
    print: (config: unknown, data: Array<string | Record<string, unknown>>) => Promise<void>;
  }

  interface AndroidBluetoothPrinterBridge {
    isConnected?: () => Promise<{ connected: boolean }>;
    connect?: () => Promise<void>;
    printReceipt?: (args: { payload: ReceiptPayload }) => Promise<void>;
    printEscPos?: (args: { data: string }) => Promise<void>;
  }

  interface CapacitorPluginsWithPrinter {
    BluetoothPrinter?: AndroidBluetoothPrinterBridge;
    SukiBluetoothPrinter?: AndroidBluetoothPrinterBridge;
  }

  interface CapacitorRuntime {
    isNativePlatform?: () => boolean;
    Plugins?: CapacitorPluginsWithPrinter;
  }

  interface Window {
    qz?: QZBridge;
    Capacitor?: CapacitorRuntime;
  }
}

export {};
