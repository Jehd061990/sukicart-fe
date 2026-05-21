import { ReceiptPayload } from "@/lib/pos-printing/types";

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

export const isDesktopLocalBridgeAvailable = () => {
  const qz = getQZBridge();
  return Boolean(qz);
};

export const isAndroidBluetoothBridgeAvailable = () => {
  return Boolean(getAndroidBluetoothBridge());
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
    await bridge.connect();
    return { ok: true, message: "Bluetooth printer connected" };
  }

  return { ok: false, message: "Bluetooth bridge has no connect method" };
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
    await bridge.printEscPos({ data: toEscPosText(payload) });
    return { ok: true, message: "Printed ESC/POS through Android Bluetooth bridge" };
  }

  return { ok: false, message: "Bluetooth bridge has no print method" };
};
