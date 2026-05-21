import { POSRuntimeProfile } from "@/lib/pos-adaptive/types";

export type PrintStatus =
  | "PRINTING"
  | "PRINT_SUCCESS"
  | "PRINT_FAILED"
  | "PRINTER_OFFLINE"
  | "BLUETOOTH_DISCONNECTED";

export type ReceiptPaperSize = "58mm" | "80mm";

export type PrinterAdapterType =
  | "browser"
  | "bluetooth"
  | "airprint"
  | "local-bridge";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
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
}

export interface PrintResult {
  status: PrintStatus;
  adapterType: PrinterAdapterType;
  message: string;
  printedAt?: string;
}

export interface PrintContext {
  runtimeProfile: POSRuntimeProfile;
  preferBluetooth?: boolean;
  preferredAdapter?: PrinterAdapterType;
  printerName?: string;
}

export interface PrinterAdapter {
  type: PrinterAdapterType;
  isSupported: (context: PrintContext) => boolean;
  connect?: (context: PrintContext) => Promise<PrintResult>;
  printReceipt: (payload: ReceiptPayload, context: PrintContext) => Promise<PrintResult>;
}
