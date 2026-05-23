import { buildEscPosReceipt } from "@/lib/pos-printing/escpos";
import { ReceiptPayload, ThermalPrinterDevice } from "@/lib/pos-printing/types";

type BluetoothBridgeLike = {
  scanDevices?: () => Promise<unknown>;
  connect?: (args?: { macAddress?: string; address?: string; id?: string }) => Promise<void>;
  disconnect?: () => Promise<void>;
  isConnected?: () => Promise<{ connected: boolean }>;
  getConnectedDevice?: () => Promise<unknown>;
  printReceipt?: (args: { payload: ReceiptPayload }) => Promise<void>;
  printEscPos?: (args: { data?: string; bytes?: Uint8Array }) => Promise<void>;
  getPairedDevices?: () => Promise<unknown>;
  listPairedDevices?: () => Promise<unknown>;
  listBondedDevices?: () => Promise<unknown>;
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
  [key: string]: unknown;
};

type CordovaBluetoothSerialLike = {
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
    data: string | ArrayBuffer,
    onSuccess: () => void,
    onError: (error: unknown) => void,
  ) => void;
  writeBinary?: (
    data: string | ArrayBuffer,
    onSuccess: () => void,
    onError: (error: unknown) => void,
  ) => void;
};

type CordovaAndroidPermissionsLike = {
  PERMISSION?: Record<string, string>;
  hasPermission: (
    permission: string,
    success: (result: { hasPermission?: boolean }) => void,
    error: (reason: unknown) => void,
  ) => void;
  requestPermissions: (
    permissions: string[],
    success: (result: { hasPermission?: boolean }) => void,
    error: (reason: unknown) => void,
  ) => void;
};

type WebBluetoothLikeDevice = {
  id: string;
  name?: string | null;
};

let selectedWebBluetoothDevice: WebBluetoothLikeDevice | null = null;

const asPromise = <T>(
  executor: (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: unknown) => void,
  ) => void,
) => new Promise<T>(executor);

const getCordovaBluetoothSerial = (): CordovaBluetoothSerialLike | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const serial = (window as Window & { bluetoothSerial?: CordovaBluetoothSerialLike })
    .bluetoothSerial;
  return serial || null;
};

const getCordovaAndroidPermissions = (): CordovaAndroidPermissionsLike | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (window as Window & {
      cordova?: {
        plugins?: {
          permissions?: CordovaAndroidPermissionsLike;
        };
      };
    }).cordova?.plugins?.permissions || null
  );
};

const hasCordovaPermission = async (
  permissions: CordovaAndroidPermissionsLike,
  permission: string,
) =>
  asPromise<boolean>((resolve) => {
    permissions.hasPermission(
      permission,
      (result) => resolve(Boolean(result?.hasPermission)),
      () => resolve(false),
    );
  });

const requestCordovaPermissions = async (
  permissions: CordovaAndroidPermissionsLike,
  requested: string[],
) =>
  asPromise<boolean>((resolve) => {
    permissions.requestPermissions(
      requested,
      (result) => resolve(Boolean(result?.hasPermission)),
      () => resolve(false),
    );
  });

const ensureCordovaAndroidBluetoothPermissions = async () => {
  if (typeof window === "undefined") {
    return;
  }

  const isNative =
    typeof window.Capacitor?.isNativePlatform === "function"
      ? Boolean(window.Capacitor.isNativePlatform())
      : false;

  if (!isNative) {
    return;
  }

  const permissions = getCordovaAndroidPermissions();
  if (!permissions) {
    return;
  }

  const manifestPermissions = permissions.PERMISSION || {};
  const androidVersion = Number.parseInt((navigator.userAgent.match(/Android\s(\d+)/i)?.[1] || "0"), 10);

  const bluetoothScan =
    manifestPermissions.BLUETOOTH_SCAN || "android.permission.BLUETOOTH_SCAN";
  const bluetoothConnect =
    manifestPermissions.BLUETOOTH_CONNECT || "android.permission.BLUETOOTH_CONNECT";
  const fineLocation =
    manifestPermissions.ACCESS_FINE_LOCATION || "android.permission.ACCESS_FINE_LOCATION";

  const required =
    androidVersion >= 12
      ? [bluetoothScan, bluetoothConnect]
      : [fineLocation];

  const missing: string[] = [];
  for (const permission of required) {
    const granted = await hasCordovaPermission(permissions, permission);
    if (!granted) {
      missing.push(permission);
    }
  }

  if (!missing.length) {
    return;
  }

  const granted = await requestCordovaPermissions(permissions, missing);
  if (!granted) {
    throw new Error("Bluetooth permissions were denied. Allow Nearby devices permission and try again.");
  }
};

const createCordovaBluetoothBridge = (): BluetoothBridgeLike | null => {
  const serial = getCordovaBluetoothSerial();
  if (!serial) {
    return null;
  }

  const listDevices = () =>
    asPromise<unknown>((resolve, reject) => {
      serial.list(resolve, reject);
    });

  const discoverDevices = () =>
    asPromise<unknown>((resolve, reject) => {
      if (!serial.discoverUnpaired) {
        resolve([]);
        return;
      }

      serial.discoverUnpaired(resolve, reject);
    });

  const connect = (args?: { macAddress?: string; address?: string; id?: string }) => {
    const target = args?.macAddress || args?.address || args?.id;
    if (!target) {
      return Promise.reject(new Error("Bluetooth address is required for connect"));
    }

    return asPromise<void>((resolve, reject) => {
      serial.connect(target, () => resolve(), reject);
    });
  };

  const disconnect = () =>
    asPromise<void>((resolve, reject) => {
      serial.disconnect(resolve, reject);
    });

  const isConnected = () =>
    asPromise<{ connected: boolean }>((resolve) => {
      serial.isConnected(
        () => resolve({ connected: true }),
        () => resolve({ connected: false }),
      );
    });

  const toLatin1String = (bytes: Uint8Array) => {
    let out = "";
    for (const value of bytes) {
      out += String.fromCharCode(value);
    }
    return out;
  };

  const toArrayBuffer = (bytes: Uint8Array) => {
    return Uint8Array.from(bytes).buffer;
  };

  const printEscPos = (args: { data?: string; bytes?: Uint8Array }) => {
    const writer = serial.writeBinary || serial.write;
    if (!writer) {
      return Promise.reject(new Error("No write method in bluetoothSerial"));
    }

    const payload =
      args.bytes && args.bytes.length
        ? serial.writeBinary
          ? toArrayBuffer(args.bytes)
          : toLatin1String(args.bytes)
        : args.data || "";

    return asPromise<void>((resolve, reject) => {
      writer(payload, resolve, reject);
    });
  };

  return {
    scanDevices: async () => {
      await ensureCordovaAndroidBluetoothPermissions();
      return listDevices();
    },
    listPairedDevices: async () => {
      await ensureCordovaAndroidBluetoothPermissions();
      return listDevices();
    },
    listBondedDevices: async () => {
      await ensureCordovaAndroidBluetoothPermissions();
      return listDevices();
    },
    getPairedDevices: async () => {
      await ensureCordovaAndroidBluetoothPermissions();
      return listDevices();
    },
    discoverDevices: async () => {
      await ensureCordovaAndroidBluetoothPermissions();
      return discoverDevices();
    },
    connect: async (args?: { macAddress?: string; address?: string; id?: string }) => {
      await ensureCordovaAndroidBluetoothPermissions();
      return connect(args);
    },
    disconnect,
    isConnected,
    printEscPos,
  };
};

export const getQZBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.qz || null;
};

const resolveAndroidBluetoothBridge = (): {
  bridge: BluetoothBridgeLike | null;
  pluginName: string | null;
} => {
  if (typeof window === "undefined") {
    return {
      bridge: null,
      pluginName: null,
    };
  }

  const plugins = window.Capacitor?.Plugins;
  const cordovaBridge = createCordovaBluetoothBridge();
  if (cordovaBridge) {
    return {
      bridge: cordovaBridge,
      pluginName: "cordova-plugin-bluetooth-serial",
    };
  }

  const known = plugins?.SukiBluetoothPrinter || plugins?.BluetoothPrinter;
  if (known) {
    return {
      bridge: known as BluetoothBridgeLike,
      pluginName: plugins?.SukiBluetoothPrinter ? "SukiBluetoothPrinter" : "BluetoothPrinter",
    };
  }

  if (!plugins || typeof plugins !== "object") {
    return {
      bridge: null,
      pluginName: null,
    };
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
      return {
        bridge: candidate as BluetoothBridgeLike,
        pluginName: key,
      };
    }
  }

  return {
    bridge: null,
    pluginName: null,
  };
};

export const getAndroidBluetoothBridge = (): BluetoothBridgeLike | null => {
  return resolveAndroidBluetoothBridge().bridge;
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

const getBridgeMethodNames = (bridge: BluetoothBridgeLike | null) => {
  if (!bridge) {
    return [];
  }

  return Object.keys(bridge).filter((key) => typeof bridge[key] === "function");
};

const invokeBridgeMethod = async (
  bridge: BluetoothBridgeLike | null,
  methodNames: string[],
) => {
  if (!bridge) {
    return { called: false, response: null as unknown };
  }

  for (const methodName of methodNames) {
    const method = bridge[methodName];
    if (typeof method !== "function") {
      continue;
    }

    try {
      const response = await (method as () => Promise<unknown>)();
      return { called: true, response };
    } catch {
      // Try the next vendor-specific method.
    }
  }

  return { called: false, response: null as unknown };
};

const asEnabledState = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Boolean(record.enabled ?? record.isEnabled ?? false);
  }

  return false;
};

export const getAndroidBluetoothDiagnostics = async () => {
  const resolved = resolveAndroidBluetoothBridge();
  const bridge = resolved.bridge;

  const isCapacitorNative =
    typeof window !== "undefined" && typeof window.Capacitor?.isNativePlatform === "function"
      ? Boolean(window.Capacitor.isNativePlatform())
      : false;
  const methods = getBridgeMethodNames(bridge);

  const permissionCheck = await invokeBridgeMethod(bridge, ["checkPermissions"]);
  const enabledCheck = await invokeBridgeMethod(bridge, ["isEnabled"]);

  const permissionState = permissionCheck.called
    ? JSON.stringify(permissionCheck.response)
    : "unavailable";

  return {
    isCapacitorNative,
    hasBridge: Boolean(bridge),
    pluginName: resolved.pluginName,
    methods,
    permissionState,
    bluetoothEnabled:
      enabledCheck.called && enabledCheck.response !== null
        ? asEnabledState(enabledCheck.response)
        : null,
  };
};

const prepareAndroidBluetoothBridge = async (bridge: BluetoothBridgeLike | null) => {
  if (!bridge) {
    return;
  }

  const check = await invokeBridgeMethod(bridge, ["checkPermissions"]);
  if (check.called) {
    const state = check.response as Record<string, unknown> | null;
    const granted = Boolean(
      state &&
        (state.granted === true ||
          state.bluetooth === "granted" ||
          state.bluetoothScan === "granted" ||
          state.bluetoothConnect === "granted"),
    );

    if (!granted) {
      await invokeBridgeMethod(bridge, [
        "requestPermissions",
        "requestBluetoothPermissions",
        "ensurePermissions",
      ]);
    }
  } else {
    await invokeBridgeMethod(bridge, [
      "requestPermissions",
      "requestBluetoothPermissions",
      "ensurePermissions",
    ]);
  }

  const enabledCheck = await invokeBridgeMethod(bridge, ["isEnabled"]);
  if (!enabledCheck.called || !asEnabledState(enabledCheck.response)) {
    await invokeBridgeMethod(bridge, ["ensureBluetoothEnabled", "enableBluetooth", "enable"]);
  }

  await invokeBridgeMethod(bridge, ["initialize", "init"]);
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
  await prepareAndroidBluetoothBridge(bridge);

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

      selectedWebBluetoothDevice = {
        id: device.id,
        name: device.name || null,
      };

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
    message: bridge
      ? `Bluetooth bridge detected but no device methods returned printers. Available methods: ${getBridgeMethodNames(bridge).join(", ") || "none"}`
      : "No Android Bluetooth bridge detected. In browser/PWA mode, paired classic printers like BP-210 are not discoverable. Use Android app build with Capacitor Bluetooth plugin.",
    printers: [],
  };
};

export const connectAndroidBluetoothPrinter = async (printer?: ThermalPrinterDevice) => {
  const bridge = getAndroidBluetoothBridge();
  if (!bridge) {
    const bluetooth = getWebBluetooth();
    const requestedPrinterId = printer?.id || printer?.macAddress;
    const canUseWebBluetoothSelection = Boolean(
      bluetooth?.requestDevice &&
        (selectedWebBluetoothDevice || requestedPrinterId),
    );

    if (canUseWebBluetoothSelection) {
      return {
        ok: true,
        message:
          "Web Bluetooth device selected. Direct classic Bluetooth connect is limited in browser/PWA; use native Android build for full bridge support.",
      };
    }

    return { ok: false, message: "Android Bluetooth printer bridge was not found" };
  }

  await prepareAndroidBluetoothBridge(bridge);

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
      await bridge.printEscPos({ bytes: escpos.bytes });
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
