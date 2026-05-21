import { ReceiptPayload } from "@/lib/pos-printing/types";

const line = (left: string, right: string) => `${left}<span>${right}</span>`;

export const buildReceiptHtml = (payload: ReceiptPayload) => {
  const rows = payload.items
    .map((item) => {
      const total = item.quantity * item.price;
      return `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${total.toFixed(2)}</td></tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${payload.orderId}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 12px; color: #0f172a; }
  .receipt { width: ${payload.paperSize === "58mm" ? "220px" : "302px"}; margin: 0 auto; }
  h1, h2, p { margin: 0; }
  .muted { color: #475569; font-size: 12px; }
  .sep { border-top: 1px dashed #94a3b8; margin: 10px 0; }
  .line { display: flex; justify-content: space-between; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 3px 0; vertical-align: top; }
  td:nth-child(2), td:nth-child(3) { text-align: right; }
  .total { font-weight: 700; font-size: 14px; }
</style>
</head>
<body>
  <div class="receipt">
    <h2>${payload.sellerName}</h2>
    <p class="muted">Order ${payload.orderId}</p>
    <p class="muted">Cashier ${payload.cashierName}</p>
    <p class="muted">Device ${payload.deviceName}</p>
    <p class="muted">${new Date(payload.createdAt).toLocaleString()}</p>
    <div class="sep"></div>
    <table>
      ${rows}
    </table>
    <div class="sep"></div>
    <p class="line">${line("Subtotal", payload.subtotal.toFixed(2))}</p>
    <p class="line">${line("Discount", `-${payload.discount.toFixed(2)}`)}</p>
    <p class="line total">${line("Total", payload.total.toFixed(2))}</p>
  </div>
</body>
</html>`;
};

export const openReceiptPrintWindow = (payload: ReceiptPayload) => {
  if (typeof window === "undefined") {
    return false;
  }

  const receiptWindow = window.open("", "_blank", "noopener,noreferrer,width=420,height=640");
  if (!receiptWindow) {
    return false;
  }

  receiptWindow.document.open();
  receiptWindow.document.write(buildReceiptHtml(payload));
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();

  return true;
};
