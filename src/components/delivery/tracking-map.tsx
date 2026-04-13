"use client";

import dynamic from "next/dynamic";
import { GeoLocation } from "@/types/delivery";

const DynamicTrackingMap = dynamic(
  () =>
    import("@/components/delivery/tracking-map-inner").then(
      (mod) => mod.TrackingMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-105 w-full items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

interface TrackingMapProps {
  riderLocation?: GeoLocation | null;
  sellerLocation?: GeoLocation | null;
  buyerLocation?: GeoLocation | null;
  targetLocation?: GeoLocation | null;
}

export function TrackingMap({
  riderLocation,
  sellerLocation,
  buyerLocation,
  targetLocation,
}: TrackingMapProps) {
  return (
    <DynamicTrackingMap
      riderLocation={riderLocation}
      sellerLocation={sellerLocation}
      buyerLocation={buyerLocation}
      targetLocation={targetLocation}
    />
  );
}
