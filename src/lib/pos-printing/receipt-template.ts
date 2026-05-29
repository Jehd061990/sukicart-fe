import { ReceiptPayload } from "@/lib/pos-printing/types";

const line = (left: string, right: string) => `${left}<span>${right}</span>`;
const toCurrency = (value: number) => value.toFixed(2);

const TAX_TYPE_LABEL: Record<string, string> = {
  VAT: "VAT 12%",
  VAT_EXEMPT: "VAT Exempt",
  ZERO_RATED: "Zero Rated",
  NON_VAT: "Non-VAT",
};

export const buildReceiptHtml = (payload: ReceiptPayload) => {
  const rows = payload.items
    .map((item) => {
      const total = item.quantity * item.price;
      const taxLabel = TAX_TYPE_LABEL[String(item.taxType || "NON_VAT")] || "Non-VAT";
      return `<tr><td>${item.name}<div class="tax-badge">${taxLabel}</div></td><td>${item.quantity}</td><td>${total.toFixed(2)}</td></tr>`;
    })
    .join("");

  const taxRows = payload.taxSummary?.taxEnabled
    ? `
    <p class="line">${line("VATable Sales", payload.taxSummary.vatableSales.toFixed(2))}</p>
    <p class="line">${line("VAT Exempt Sales", payload.taxSummary.vatExemptSales.toFixed(2))}</p>
    <p class="line">${line("Zero Rated Sales", payload.taxSummary.zeroRatedSales.toFixed(2))}</p>
    <p class="line">${line("Non-VAT Sales", payload.taxSummary.nonVatSales.toFixed(2))}</p>
    <p class="line">${line("VAT Amount", payload.taxSummary.vatAmount.toFixed(2))}</p>`
    : "";

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
  .tax-badge { display: inline-block; margin-top: 2px; padding: 1px 5px; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: 10px; }
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
    ${taxRows}
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

export const saveReceiptToPdfFile = async (payload: ReceiptPayload) => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const maxWidth = pageWidth - marginX * 2;
    const lineHeight = 5;
    let y = 14;

    const pushLine = (text: string, isHeader = false) => {
      if (y > pageHeight - 14) {
        doc.addPage();
        y = 14;
      }

      doc.setFont("helvetica", isHeader ? "bold" : "normal");
      doc.setFontSize(isHeader ? 12 : 10);
      const split = doc.splitTextToSize(text, maxWidth);
      doc.text(split, marginX, y);
      y += split.length * lineHeight;
    };

    const separator = () => {
      y += 1;
      doc.setDrawColor(148, 163, 184);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 3;
    };

    pushLine(payload.sellerName || "Receipt", true);
    pushLine(`Receipt ID: ${payload.receiptId}`);
    pushLine(`Order ID: ${payload.orderId}`);
    pushLine(`Cashier: ${payload.cashierName}`);
    pushLine(`Device: ${payload.deviceName}`);
    pushLine(`Created: ${new Date(payload.createdAt).toLocaleString()}`);
    if (payload.paymentMethod) {
      pushLine(`Payment: ${payload.paymentMethod}`);
    }

    separator();
    pushLine("Items", true);

    payload.items.forEach((item) => {
      const total = item.quantity * item.price;
      const taxLabel = TAX_TYPE_LABEL[String(item.taxType || "NON_VAT")] || "Non-VAT";
      pushLine(`${item.name}`);
      pushLine(`  ${item.quantity} x ${toCurrency(item.price)} = ${toCurrency(total)} (${taxLabel})`);
    });

    separator();
    pushLine(`Subtotal: ${toCurrency(payload.subtotal)}`);
    pushLine(`Discount: -${toCurrency(payload.discount)}`);

    if (payload.taxSummary?.taxEnabled) {
      pushLine(`VATable Sales: ${toCurrency(payload.taxSummary.vatableSales)}`);
      pushLine(`VAT Exempt Sales: ${toCurrency(payload.taxSummary.vatExemptSales)}`);
      pushLine(`Zero Rated Sales: ${toCurrency(payload.taxSummary.zeroRatedSales)}`);
      pushLine(`Non-VAT Sales: ${toCurrency(payload.taxSummary.nonVatSales)}`);
      pushLine(`VAT Amount: ${toCurrency(payload.taxSummary.vatAmount)}`);
    }

    pushLine(`Total: ${toCurrency(payload.total)}`, true);

    if (payload.footerText) {
      separator();
      pushLine(payload.footerText);
    }

    doc.save(`receipt-${payload.orderId}.pdf`);
    return true;
  } catch {
    return false;
  }
};
