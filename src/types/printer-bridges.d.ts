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
    scanDevices?: () => Promise<
      Array<{
        id?: string;
        name?: string;
        macAddress?: string;
        address?: string;
        paired?: boolean;
        rssi?: number;
      }>
    >;
    getPairedDevices?: () => Promise<
      Array<{
        id?: string;
        name?: string;
        macAddress?: string;
        address?: string;
        paired?: boolean;
        rssi?: number;
      }>
    >;
    listPairedDevices?: () => Promise<
      Array<{
        id?: string;
        name?: string;
        macAddress?: string;
        address?: string;
        paired?: boolean;
        rssi?: number;
      }>
    >;
    listBondedDevices?: () => Promise<
      Array<{
        id?: string;
        name?: string;
        macAddress?: string;
        address?: string;
        paired?: boolean;
        rssi?: number;
      }>
    >;
    requestPermissions?: () => Promise<unknown>;
    requestBluetoothPermissions?: () => Promise<unknown>;
    ensurePermissions?: () => Promise<unknown>;
    checkPermissions?: () => Promise<unknown>;
    enable?: () => Promise<unknown>;
    enableBluetooth?: () => Promise<unknown>;
    ensureBluetoothEnabled?: () => Promise<unknown>;
    isEnabled?: () => Promise<boolean | { enabled?: boolean; isEnabled?: boolean }>;
    initialize?: () => Promise<unknown>;
    init?: () => Promise<unknown>;
    isConnected?: () => Promise<{ connected: boolean }>;
    getConnectedDevice?: () => Promise<{
      id?: string;
      name?: string;
      macAddress?: string;
      address?: string;
    } | null>;
    connect?: (args?: { macAddress?: string; address?: string; id?: string }) => Promise<void>;
    disconnect?: () => Promise<void>;
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
    bluetoothSerial?: {
      list: (
        onSuccess: (devices: unknown) => void,
        onError: (error: unknown) => void,
      ) => void;
      discoverUnpaired?: (
        onSuccess: (devices: unknown) => void,
        onError: (error: unknown) => void,
      ) => void;
      connect: (
        address: string,
        onSuccess: (data?: unknown) => void,
        onError: (error: unknown) => void,
      ) => void;
      disconnect: (
        onSuccess: () => void,
        onError: (error: unknown) => void,
      ) => void;
      isConnected: (
        onSuccess: () => void,
        onError: (error: unknown) => void,
      ) => void;
      write?: (
        data: string,
        onSuccess: () => void,
        onError: (error: unknown) => void,
      ) => void;
      writeBinary?: (
        data: string,
        onSuccess: () => void,
        onError: (error: unknown) => void,
      ) => void;
    };
  }
}

export {};
