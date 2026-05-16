"use client";

import { CategoryThumbnailShape } from "@/types/store-config";

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
  labelByCategory?: Record<string, string>;
  thumbnailByCategory?: Record<string, string>;
  thumbnailShape?: CategoryThumbnailShape;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onChange,
  labelByCategory,
  thumbnailByCategory,
  thumbnailShape = "rounded",
}: CategoryTabsProps) {
  const imageShapeClass = thumbnailShape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        const label = labelByCategory?.[category] || category;
        const thumbnail = thumbnailByCategory?.[category] || "";
        const fallbackInitials =
          category === "all"
            ? "All"
            : label
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.slice(0, 1))
                .join("")
                .toUpperCase();

        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold tracking-wide transition ${
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {category !== "all" && thumbnail ? (
                <img
                  src={thumbnail}
                  alt={label}
                  className={`h-5 w-5 object-cover ring-1 ring-black/10 ${imageShapeClass}`}
                  loading="lazy"
                />
              ) : (
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center text-[9px] font-bold uppercase ${imageShapeClass} ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {fallbackInitials}
                </span>
              )}
              <span className="uppercase">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
