import { POSRuntimeProfile } from "@/lib/pos-adaptive/types";

export type PrintStatus =
  | "PRINTING"
  | "PENDING_PRINT"
  | "PRINT_SUCCESS"
  | "PRINT_FAILED"
  | "PRINTER_OFFLINE"
  | "BLUETOOTH_DISCONNECTED"
  | "OUT_OF_PAPER";

export type PrinterConnectionStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "FAILED";

export type ReceiptPaperSize = "58mm" | "80mm";

export type PrinterAdapterType =
  | "browser"
  | "bluetooth"
  | "airprint"
  | "local-bridge";

export type ConnectionType = "bluetooth";

export interface SavedPrinterSettings {
  printerName: string;
  printerMac: string;
  connectionType: ConnectionType;
  paperSize: ReceiptPaperSize;
  autoReconnect: boolean;
}

export interface ThermalPrinterDevice {
  id: string;
  name: string;
  macAddress?: string;
  paired?: boolean;
  connectionType: ConnectionType;
  rssi?: number;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  taxType?: "VAT" | "VAT_EXEMPT" | "ZERO_RATED" | "NON_VAT";
}

export interface ReceiptTaxSummary {
  businessTaxType: "VAT" | "NON_VAT";
  taxEnabled: boolean;
  defaultVatRate: number;
  subtotal: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  nonVatSales: number;
  totalTax: number;
  grandTotal: number;
}

export interface ReceiptPayload {
  receiptId: string;
  orderId: string;
  createdAt: string;
  sellerName: string;
  cashierName: string;
  deviceName: string;
  paperSize: ReceiptPaperSize;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  vat?: number;
  taxSummary?: ReceiptTaxSummary;
  paymentMethod?: string;
  footerText?: string;
  qrCodeValue?: string;
  barcodeValue?: string;
}

export interface PrintResult {
  status: PrintStatus;
  adapterType: PrinterAdapterType;
  message: string;
  printedAt?: string;
}

export interface PrinterConnectionResult {
  status: PrinterConnectionStatus;
  adapterType: PrinterAdapterType;
  message: string;
  printer?: ThermalPrinterDevice;
}

export interface PrinterScanResult {
  adapterType: PrinterAdapterType;
  printers: ThermalPrinterDevice[];
  message: string;
}

export interface PrintQueueItem {
  id: string;
  receipt: ReceiptPayload;
  status: PrintStatus;
  reason: string;
  createdAt: string;
  lastTriedAt?: string;
  attempts: number;
}

export interface ReceiptHistoryEntry {
  id: string;
  receipt: ReceiptPayload;
  status: "PRINT_SUCCESS" | "PRINT_FAILED" | "PENDING_PRINT";
  message: string;
  createdAt: string;
  updatedAt: string;
  lastTriedAt?: string;
  attempts: number;
}

export interface PrintContext {
  runtimeProfile: POSRuntimeProfile;
  preferBluetooth?: boolean;
  preferredAdapter?: PrinterAdapterType;
  printerName?: string;
  selectedPrinter?: ThermalPrinterDevice;
  printerSettings?: SavedPrinterSettings;
}

export interface PrinterAdapter {
  type: PrinterAdapterType;
  isSupported: (context: PrintContext) => boolean;
  scan?: (context: PrintContext) => Promise<PrinterScanResult>;
  connect?: (
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ) => Promise<PrinterConnectionResult>;
  disconnect?: (
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ) => Promise<PrinterConnectionResult>;
  getConnectionStatus?: (
    context: PrintContext,
    printer?: ThermalPrinterDevice,
  ) => Promise<PrinterConnectionResult>;
  printReceipt: (payload: ReceiptPayload, context: PrintContext) => Promise<PrintResult>;
}
