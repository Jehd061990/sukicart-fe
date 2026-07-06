import { ProductTaxType } from "@/types/product";
import { BusinessTaxType, StoreCategoryKey, StoreTaxConfig } from "@/types/store-config";

export interface TaxableLineInput {
  category?: StoreCategoryKey;
  lineTotal: number;
  taxType?: ProductTaxType;
  taxRate?: number;
}

export interface ComputedTaxSummary {
  businessTaxType: BusinessTaxType;
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

const round = (value: number) => Number(value.toFixed(2));

const normalizeTaxType = (value: unknown): ProductTaxType => {
  const normalized = String(value || "").trim().toUpperCase();
  if (
    normalized === "VAT" ||
    normalized === "VAT_EXEMPT" ||
    normalized === "ZERO_RATED" ||
    normalized === "NON_VAT"
  ) {
    return normalized;
  }

  return "NON_VAT";
};

export const resolveEffectiveTax = (
  line: Pick<TaxableLineInput, "category" | "taxRate" | "taxType">,
  taxConfig?: StoreTaxConfig,
) => {
  const taxEnabled = taxConfig?.enabled !== false;
  const businessTaxType = String(taxConfig?.businessTaxType || "VAT").toUpperCase() as BusinessTaxType;
  const defaultVatRate = Number.isFinite(Number(taxConfig?.defaultVatRate))
    ? Number(taxConfig?.defaultVatRate)
    : 12;

  if (!taxEnabled || businessTaxType === "NON_VAT") {
    return { taxType: "NON_VAT" as ProductTaxType, taxRate: 0 };
  }

  const categoryDefault = line.category ? taxConfig?.categoryDefaults?.[line.category] : null;
  const resolvedTaxType = normalizeTaxType(line.taxType || categoryDefault?.taxType || "VAT");

  if (resolvedTaxType !== "VAT") {
    return { taxType: resolvedTaxType, taxRate: 0 };
  }

  const resolvedRate = Number.isFinite(Number(line.taxRate))
    ? Number(line.taxRate)
    : Number.isFinite(Number(categoryDefault?.taxRate))
      ? Number(categoryDefault?.taxRate)
      : defaultVatRate;

  return {
    taxType: "VAT" as ProductTaxType,
    taxRate: Math.max(0, Math.min(100, resolvedRate)),
  };
};

export const computeTaxSummary = (
  lines: TaxableLineInput[],
  taxConfig?: StoreTaxConfig,
): ComputedTaxSummary => {
  const safeLines = Array.isArray(lines) ? lines : [];
  const businessTaxType = String(taxConfig?.businessTaxType || "VAT").toUpperCase() as BusinessTaxType;
  const taxEnabled = taxConfig?.enabled !== false;
  const defaultVatRate = Number.isFinite(Number(taxConfig?.defaultVatRate))
    ? Number(taxConfig?.defaultVatRate)
    : 12;

  let subtotal = 0;
  let vatableSales = 0;
  let vatAmount = 0;
  let vatExemptSales = 0;
  let zeroRatedSales = 0;
  let nonVatSales = 0;

  for (const line of safeLines) {
    const lineTotal = Number(line.lineTotal || 0);
    subtotal += lineTotal;

    const resolved = resolveEffectiveTax(line, taxConfig);

    if (resolved.taxType === "VAT") {
      vatableSales += lineTotal;
      vatAmount += (lineTotal * resolved.taxRate) / 100;
    } else if (resolved.taxType === "VAT_EXEMPT") {
      vatExemptSales += lineTotal;
    } else if (resolved.taxType === "ZERO_RATED") {
      zeroRatedSales += lineTotal;
    } else {
      nonVatSales += lineTotal;
    }
  }

  const subtotalRounded = round(subtotal);
  const vatRounded = taxEnabled && businessTaxType === "VAT" ? round(vatAmount) : 0;

  return {
    businessTaxType,
    taxEnabled,
    defaultVatRate: round(defaultVatRate),
    subtotal: subtotalRounded,
    vatableSales: round(vatableSales),
    vatAmount: vatRounded,
    vatExemptSales: round(vatExemptSales),
    zeroRatedSales: round(zeroRatedSales),
    nonVatSales: round(nonVatSales),
    totalTax: vatRounded,
    grandTotal: round(subtotalRounded + vatRounded),
  };
};
