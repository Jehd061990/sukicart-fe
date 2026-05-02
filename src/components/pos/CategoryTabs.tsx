"use client";

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {categories.map((category) => {
        const isActive = activeCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
