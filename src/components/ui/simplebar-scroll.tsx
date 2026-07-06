"use client";

import { ReactNode } from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { cn } from "@/lib/utils";

interface SimplebarScrollProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  autoHide?: boolean;
}

export function SimplebarScroll({
  children,
  className,
  contentClassName,
  autoHide = true,
}: SimplebarScrollProps) {
  return (
    <SimpleBar className={cn("h-full", className)} autoHide={autoHide}>
      <div className={contentClassName}>{children}</div>
    </SimpleBar>
  );
}
