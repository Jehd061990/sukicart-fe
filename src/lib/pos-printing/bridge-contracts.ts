import { buildEscPosReceipt } from "@/lib/pos-printing/escpos";
import { ReceiptPayload, ThermalPrinterDevice } from "@/lib/pos-printing/types";

type BluetoothBridgeLike = {
  scanDevices?: () => Promise<unknown>;
  connect?: (args?: { macAddress?: string; address?: string; id?: string }) => Promise<void>;
  disconnect?: () => Promise<void>;
  isConnected?: () => Promise<{ connected: boolean }>;
  getConnectedDevice?: () => Promise<unknown>;
  printReceipt?: (args: { payload: ReceiptPayload }) => Promise<void>;
  printEscPos?: (args: { data: string }) => Promise<void>;
  getPairedDevices?: () => Promise<unknown>;
  listPairedDevices?: () => Promise<unknown>;
  listBondedDevices?: () => Promise<unknown>;
  [key: string]: unknown;
};

export const getQZBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.qz || null;
};

export const getAndroidBluetoothBridge = (): BluetoothBridgeLike | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const plugins = window.Capacitor?.Plugins;
  const known = plugins?.SukiBluetoothPrinter || plugins?.BluetoothPrinter;
  if (known) {
    return known as BluetoothBridgeLike;
  }

  if (!plugins || typeof plugins !== "object") {
    return null;
  }

  const entries = Object.entries(plugins as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const candidate = value as Record<string, unknown>;
    const hasBluetoothName = /bluetooth|printer/i.test(key);
    const hasBluetoothMethods =
      typeof candidate.connect === "function" ||
      typeof candidate.scanDevices === "function" ||
      typeof candidate.getPairedDevices === "function" ||
      typeof candidate.printReceipt === "function" ||
      typeof candidate.printEscPos === "function";

    if (hasBluetoothName && hasBluetoothMethods) {
      return candidate as BluetoothBridgeLike;
    }
  }

  return null;
};

const getWebBluetooth = () => {
  if (typeof navigator === "undefined") {
    return null;
  }

  const webNavigator = navigator as Navigator & {
    bluetooth?: {
      requestDevice?: (options: {
        acceptAllDevices?: boolean;
        optionalServices?: string[];
      }) => Promise<{ id: string; name?: string | null }>;
    };
  };

  return webNavigator.bluetooth || null;
};

export const isDesktopLocalBridgeAvailable = () => {
  const qz = getQZBridge();
  return Boolean(qz);
};

export const isAndroidBluetoothBridgeAvailable = () => {
  return Boolean(getAndroidBluetoothBridge() || getWebBluetooth());
};

const toEscPosText = (payload: ReceiptPayload) => {
  const lines = payload.items.map(
    (item) => `${item.quantity}x ${item.name}  ${(item.quantity * item.price).toFixed(2)}`,
  );

  return [
    payload.sellerName,
    `Order: ${payload.orderId}`,
    `Cashier: ${payload.cashierName}`,
    "------------------------------",
    ...lines,
    "------------------------------",
    `Subtotal: ${payload.subtotal.toFixed(2)}`,
    `Discount: -${payload.discount.toFixed(2)}`,
    `Total: ${payload.total.toFixed(2)}`,
    "\n\n\n",
  ].join("\n");
};

const normalizeBluetoothDevice = (device: {
  id?: string;
  name?: string;
  macAddress?: string;
  address?: string;
  paired?: boolean;
  rssi?: number;
}): ThermalPrinterDevice => {
  const macAddress = device.macAddress || device.address || "";
  const id = device.id || macAddress || `${device.name || "printer"}-${Date.now()}`;

  return {
    id,
    name: device.name || "Unknown Bluetooth Printer",
    macAddress: macAddress || undefined,
    paired: Boolean(device.paired),
    connectionType: "bluetooth",
    rssi: typeof device.rssi === "number" ? device.rssi : undefined,
  };
};

type RawBluetoothDevice = {
  id?: string;
  name?: string;
  macAddress?: string;
  address?: string;
  paired?: boolean;
  rssi?: number;
};

const extractBluetoothDevices = (input: unknown): RawBluetoothDevice[] => {
  if (Array.isArray(input)) {
    return input as RawBluetoothDevice[];
  }

  if (!input || typeof input !== "object") {
    return [];
  }

  const asRecord = input as Record<string, unknown>;
  const listCandidateKeys = ["devices", "printers", "results", "data", "items"];

  for (const key of listCandidateKeys) {
    const value = asRecord[key];
    if (Array.isArray(value)) {
      return value as RawBluetoothDevice[];
    }
  }

  if (
    typeof asRecord.id === "string" ||
    typeof asRecord.name === "string" ||
    typeof asRecord.address === "string" ||
    typeof asRecord.macAddress === "string"
  ) {
    return [asRecord as RawBluetoothDevice];
  }

  return [];
};

const normalizeBluetoothList = (
  devices: Array<RawBluetoothDevice> | null | undefined,
) => (Array.isArray(devices) ? devices : []).map((entry) => normalizeBluetoothDevice(entry));

const invokeDeviceListMethod = async (
  bridge: Record<string, unknown> | null,
  methodNames: string[],
) => {
  if (!bridge) {
    return null;
  }

  for (const methodName of methodNames) {
    const method = bridge[methodName];
    if (typeof method !== "function") {
      continue;
    }

    try {
      const response = await (method as () => Promise<unknown>)();
      const extracted = extractBluetoothDevices(response);
      return extracted;
    } catch {
      // Keep trying other vendor-specific methods.
    }
  }

  return null;
};

export const connectDesktopLocalBridge = async () => {
  const qz = getQZBridge();
  if (!qz) {
    return { ok: false, message: "QZ Tray bridge was not found" };
  }

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }

  return { ok: true, message: "QZ Tray bridge connected" };
};

export const printThroughDesktopLocalBridge = async (
  payload: ReceiptPayload,
  preferredPrinterName?: string,
) => {
  const qz = getQZBridge();
  if (!qz) {
    return { ok: false, message: "QZ Tray bridge was not found" };
  }

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }

  const printer = preferredPrinterName
    ? await qz.printers.find(preferredPrinterName)
    : await qz.printers.getDefault();
  const config = qz.configs.create(printer);
  const text = toEscPosText(payload);

  await qz.print(config, [text]);
  return { ok: true, message: `Printed via QZ Tray on ${printer}` };
};

export const connectAndroidBluetoothBridge = async () => {
  return connectAndroidBluetoothPrinter();
};

export const scanAndroidBluetoothPrinters = async () => {
  const bridge = getAndroidBluetoothBridge();

  const bridgeRecord = bridge as Record<string, unknown> | null;
  const scanned = await invokeDeviceListMethod(bridgeRecord, [
    "scanDevices",
    "startScan",
    "discoverDevices",
    "searchDevices",
    "findDevices",
    "requestDevices",
    "getDevices",
    "listDevices",
    "getBluetoothDevices",
  ]);

  if (scanned) {
    const printers = normalizeBluetoothList(scanned);

    if (printers.length > 0) {
      return {
        ok: true,
        message: `Discovered ${printers.length} Bluetooth printer(s)`,
        printers,
      };
    }
  }

  const paired = await invokeDeviceListMethod(bridgeRecord, [
    "getPairedDevices",
    "listPairedDevices",
    "listBondedDevices",
    "getBondedDevices",
    "getPairedPrinters",
    "listPairedPrinters",
    "getBondedPrinters",
    "listBondedPrinters",
  ]);

  if (paired) {
    const printers = normalizeBluetoothList(paired);

    return {
      ok: printers.length > 0,
      message: printers.length
        ? `Loaded ${printers.length} paired Bluetooth printer(s)`
        : "No paired Bluetooth printers found. Pair printer in Android Bluetooth settings first.",
      printers,
    };
  }

  const connected = await invokeDeviceListMethod(bridgeRecord, [
    "getConnectedDevice",
    "currentDevice",
    "getCurrentDevice",
    "getActiveDevice",
    "getLastConnectedDevice",
  ]);

  if (connected && connected.length > 0) {
    const printers = normalizeBluetoothList(connected);
    return {
      ok: true,
      message: "Loaded currently connected Bluetooth printer",
      printers,
    };
  }

  const bluetooth = getWebBluetooth();
  if (bluetooth?.requestDevice) {
    try {
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service"],
      });

      const printer = normalizeBluetoothDevice({
        id: device.id,
        name: device.name || "Web Bluetooth Device",
      });

      return {
        ok: true,
        message: "Bluetooth printer selected",
        printers: [printer],
      };
    } catch {
      return {
        ok: false,
        message: "Bluetooth scan canceled or unavailable",
        printers: [],
      };
    }
  }

  return {
    ok: false,
    message:
      "No Android Bluetooth bridge detected. In browser/PWA mode, paired classic printers like BP-210 are not discoverable. Use Android app build with Capacitor Bluetooth plugin.",
    printers: [],
  };
};

export const connectAndroidBluetoothPrinter = async (printer?: ThermalPrinterDevice) => {
  const bridge = getAndroidBluetoothBridge();
  if (!bridge) {
    return { ok: false, message: "Android Bluetooth printer bridge was not found" };
  }

  if (bridge.isConnected) {
    const state = await bridge.isConnected();
    if (state.connected) {
      return { ok: true, message: "Bluetooth printer already connected" };
    }
  }

  if (bridge.connect) {
    await bridge.connect({
      macAddress: printer?.macAddress,
      address: printer?.macAddress,
      id: printer?.id,
    });
    return { ok: true, message: "Bluetooth printer connected" };
  }

  return { ok: false, message: "Bluetooth bridge has no connect method" };
};

export const disconnectAndroidBluetoothPrinter = async () => {
  const bridge = getAndroidBluetoothBridge();
  if (!bridge) {
    return { ok: false, message: "Android Bluetooth printer bridge was not found" };
  }

  if (bridge.disconnect) {
    await bridge.disconnect();
    return { ok: true, message: "Bluetooth printer disconnected" };
  }

  return { ok: false, message: "Bluetooth bridge has no disconnect method" };
};

export const getAndroidBluetoothPrinterConnection = async () => {
  const bridge = getAndroidBluetoothBridge();
  if (!bridge) {
    return {
      ok: false,
      connected: false,
      message: "Android Bluetooth printer bridge was not found",
      printer: null,
    };
  }

  const state = bridge.isConnected ? await bridge.isConnected() : { connected: false };
  const connectedDevice = bridge.getConnectedDevice ? await bridge.getConnectedDevice() : null;

  return {
    ok: true,
    connected: Boolean(state.connected),
    message: state.connected ? "Bluetooth printer connected" : "Bluetooth printer disconnected",
    printer: connectedDevice ? normalizeBluetoothDevice(connectedDevice) : null,
  };
};

export const printThroughAndroidBluetoothBridge = async (payload: ReceiptPayload) => {
  const bridge = getAndroidBluetoothBridge();
  if (!bridge) {
    return { ok: false, message: "Android Bluetooth printer bridge was not found" };
  }

  if (bridge.printReceipt) {
    await bridge.printReceipt({ payload });
    return { ok: true, message: "Printed through Android Bluetooth bridge" };
  }

  if (bridge.printEscPos) {
    const escpos = buildEscPosReceipt(payload);

    try {
      await bridge.printEscPos({ data: escpos.base64 });
      return { ok: true, message: "Printed ESC/POS through Android Bluetooth bridge" };
    } catch {
      await bridge.printEscPos({ data: toEscPosText(payload) });
      return {
        ok: true,
        message: "Printed text fallback through Android Bluetooth bridge",
      };
    }
  }

  return { ok: false, message: "Bluetooth bridge has no print method" };
};
