import { ReceiptPayload } from "@/lib/pos-printing/types";

const encoder = new TextEncoder();

const ESC = 0x1b;
const GS = 0x1d;

const PAPER_WIDTH_CHARS: Record<ReceiptPayload["paperSize"], number> = {
  "58mm": 32,
  "80mm": 48,
};

const money = (value: number) => value.toFixed(2);

const padRight = (value: string, width: number) => {
  if (value.length >= width) {
    return value.slice(0, width);
  }

  return `${value}${" ".repeat(width - value.length)}`;
};

const centerText = (value: string, width: number) => {
  if (value.length >= width) {
    return value.slice(0, width);
  }

  const left = Math.floor((width - value.length) / 2);
  return `${" ".repeat(left)}${value}`;
};

const splitItemLine = (name: string, qty: number, amount: number, width: number) => {
  const right = `${qty}x ${money(amount)}`;
  const leftWidth = Math.max(8, width - right.length - 1);

  if (name.length <= leftWidth) {
    return [`${padRight(name, leftWidth)} ${right}`];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < name.length) {
    chunks.push(name.slice(cursor, cursor + leftWidth));
    cursor += leftWidth;
  }

  const lines = chunks.map((chunk, index) => {
    if (index === chunks.length - 1) {
      return `${padRight(chunk, leftWidth)} ${right}`;
    }

    return chunk;
  });

  return lines;
};

class EscPosBuilder {
  private bytes: number[] = [];

  init() {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  align(mode: "left" | "center" | "right") {
    const n = mode === "left" ? 0 : mode === "center" ? 1 : 2;
    this.bytes.push(ESC, 0x61, n);
    return this;
  }

  bold(enabled: boolean) {
    this.bytes.push(ESC, 0x45, enabled ? 1 : 0);
    return this;
  }

  size(width = 0, height = 0) {
    const n = ((width & 0x0f) << 4) | (height & 0x0f);
    this.bytes.push(GS, 0x21, n);
    return this;
  }

  text(value: string) {
    this.bytes.push(...encoder.encode(value));
    return this;
  }

  line(value = "") {
    this.text(value);
    this.bytes.push(0x0a);
    return this;
  }

  hr(width: number) {
    this.line("-".repeat(width));
    return this;
  }

  qr(value: string) {
    const bytes = encoder.encode(value);
    const len = bytes.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;

    this.bytes.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06);
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30);
    this.bytes.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...bytes);
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.bytes.push(0x0a);
    return this;
  }

  barcodeCode128(value: string) {
    const bytes = encoder.encode(`{B${value}`);
    this.bytes.push(GS, 0x48, 0x02);
    this.bytes.push(GS, 0x68, 80);
    this.bytes.push(GS, 0x77, 2);
    this.bytes.push(GS, 0x6b, 0x49, bytes.length, ...bytes);
    this.bytes.push(0x0a);
    return this;
  }

  cut() {
    this.bytes.push(GS, 0x56, 0x00);
    return this;
  }

  // Reserved for future POS cash drawer support.
  triggerCashDrawer(pin: 0 | 1 = 0) {
    const m = pin === 0 ? 0 : 1;
    this.bytes.push(ESC, 0x70, m, 60, 120);
    return this;
  }

  build() {
    return Uint8Array.from(this.bytes);
  }
}

const toBase64 = (bytes: Uint8Array) => {
  const btoaFn =
    typeof globalThis !== "undefined" && typeof globalThis.btoa === "function"
      ? globalThis.btoa.bind(globalThis)
      : null;

  if (!btoaFn) {
    return "";
  }

  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoaFn(binary);
};

export const buildEscPosReceipt = (payload: ReceiptPayload) => {
  const width = PAPER_WIDTH_CHARS[payload.paperSize];
  const builder = new EscPosBuilder();

  builder
    .init()
    .align("center")
    .bold(true)
    .size(1, 1)
    .line(centerText(payload.sellerName, width))
    .size(0, 0)
    .bold(false)
    .line(`Order ${payload.orderId}`)
    .line(new Date(payload.createdAt).toLocaleString())
    .line(`Cashier: ${payload.cashierName}`)
    .line(`Device: ${payload.deviceName}`)
    .align("left")
    .hr(width);

  for (const item of payload.items) {
    const amount = item.price * item.quantity;
    const lines = splitItemLine(item.name, item.quantity, amount, width);
    for (const line of lines) {
      builder.line(line);
    }
  }

  builder
    .hr(width)
    .line(`Subtotal: ${money(payload.subtotal)}`)
    .line(`Discount: -${money(payload.discount)}`);

  if (typeof payload.vat === "number") {
    builder.line(`VAT: ${money(payload.vat)}`);
  }

  builder.bold(true).line(`TOTAL: ${money(payload.total)}`).bold(false);

  if (payload.paymentMethod) {
    builder.line(`Payment: ${payload.paymentMethod}`);
  }

  builder.align("center");

  if (payload.qrCodeValue) {
    builder.qr(payload.qrCodeValue);
  }

  if (payload.barcodeValue) {
    builder.barcodeCode128(payload.barcodeValue);
  }

  builder.line(payload.footerText || "Thank you for shopping with SukiGo!").line("\n").cut();

  const bytes = builder.build();
  return {
    bytes,
    base64: toBase64(bytes),
  };
};
