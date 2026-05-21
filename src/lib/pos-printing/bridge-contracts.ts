import { buildEscPosReceipt } from "@/lib/pos-printing/escpos";
import { ReceiptPayload, ThermalPrinterDevice } from "@/lib/pos-printing/types";

export const getQZBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.qz || null;
};

export const getAndroidBluetoothBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const plugins = window.Capacitor?.Plugins;
  return plugins?.SukiBluetoothPrinter || plugins?.BluetoothPrinter || null;
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

const normalizeBluetoothList = (
  devices: Array<{
    id?: string;
    name?: string;
    macAddress?: string;
    address?: string;
    paired?: boolean;
    rssi?: number;
  }> | null | undefined,
) => (Array.isArray(devices) ? devices : []).map((entry) => normalizeBluetoothDevice(entry));

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

  if (bridge?.scanDevices) {
    const scanned = await bridge.scanDevices();
    const printers = normalizeBluetoothList(scanned);

    if (printers.length > 0) {
      return {
        ok: true,
        message: `Discovered ${printers.length} Bluetooth printer(s)`,
        printers,
      };
    }
  }

  const pairedDevicesMethod =
    bridge?.getPairedDevices || bridge?.listPairedDevices || bridge?.listBondedDevices;

  if (pairedDevicesMethod) {
    const paired = await pairedDevicesMethod();
    const printers = normalizeBluetoothList(paired);

    return {
      ok: printers.length > 0,
      message: printers.length
        ? `Loaded ${printers.length} paired Bluetooth printer(s)`
        : "No paired Bluetooth printers found. Pair printer in Android Bluetooth settings first.",
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
