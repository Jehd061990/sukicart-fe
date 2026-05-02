"use client";

interface ScanToastItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ItemPreviewToastProps {
  items: ScanToastItem[];
}

export function ItemPreviewToast({ items }: ItemPreviewToastProps) {
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-40 flex w-[min(88vw,22rem)] flex-col gap-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex items-center gap-3 rounded-2xl bg-white/95 p-2.5 shadow-lg ring-1 ring-slate-200 backdrop-blur animate-[toastIn_260ms_ease-out]"
        >
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="text-xs text-slate-500">PHP {item.price.toFixed(2)}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
            +{item.quantity}
          </span>
        </article>
      ))}
    </div>
  );
}
