"use client";

import { Product } from "@/types/product";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : "https://sukicart-be.onrender.com/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function resolveProductImageUrl(image?: string) {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  const normalizedPath = image.startsWith("/") ? image : `/${image}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

interface ProductCardProps {
  product: Product;
  onQuickAdd: (product: Product) => void;
  onOpenDetails: (product: Product) => void;
  highlight?: boolean;
}

export function ProductCard({
  product,
  onQuickAdd,
  onOpenDetails,
  highlight = false,
}: ProductCardProps) {
  const imageUrl = resolveProductImageUrl(product.image);
  const outOfStock = product.stock <= 0;

  return (
    <article
      className={`group rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200 transition-all duration-200 ${
        highlight ? "scale-[1.01] ring-brand-400 shadow-md" : "hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenDetails(product)}
        className="w-full text-left"
      >
        <div className="relative mb-2.5 h-28 overflow-hidden rounded-xl bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : null}
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              outOfStock
                ? "bg-rose-100 text-rose-700"
                : product.stock < 10
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {outOfStock ? "Out" : `${product.stock} ${product.unit}`}
          </span>
        </div>
        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{product.name}</p>
        <p className="mt-1 text-xs uppercase text-slate-500">{product.category}</p>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-base font-bold text-slate-900">PHP {product.price.toFixed(2)}</p>
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          disabled={outOfStock}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label={`Add ${product.name}`}
        >
          +
        </button>
      </div>
    </article>
  );
}
