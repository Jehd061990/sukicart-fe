"use client";

import { ReactNode, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

type VirtualizedSimpleBarListProps<T> = {
  items: T[];
  height: number;
  estimateSize: number;
  gap?: number;
  overscan?: number;
  className?: string;
  contentClassName?: string;
  getItemKey?: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
};

export function VirtualizedSimpleBarList<T>({
  items,
  height,
  estimateSize,
  gap = 0,
  overscan = 6,
  className,
  contentClassName = "relative p-3",
  getItemKey,
  renderItem,
}: VirtualizedSimpleBarListProps<T>) {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    gap,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <SimpleBar
      autoHide
      style={{ height }}
      className={className}
      scrollableNodeProps={{ ref: setScrollElement }}
    >
      <div
        className={contentClassName}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (item === undefined) {
            return null;
          }

          return (
            <div
              key={
                getItemKey
                  ? getItemKey(item, virtualItem.index)
                  : virtualItem.index
              }
              className="absolute left-0 top-0 w-full px-3"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </SimpleBar>
  );
}
