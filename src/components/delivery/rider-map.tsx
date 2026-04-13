"use client";

import dynamic from "next/dynamic";
import { GeoLocation } from "@/types/delivery";

const DynamicRiderMapInner = dynamic(
  () => import("./rider-map-inner").then((mod) => mod.RiderMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-105 w-full items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        Loading rider map...
      </div>
    ),
  },
);

interface RiderMapProps {
  orderStatus?: string;
  riderLocation?: GeoLocation | null;
  sellerLocation?: GeoLocation | null;
  buyerLocation?: GeoLocation | null;
  onRiderLocationUpdate?: (location: GeoLocation) => void | Promise<void>;
  autoUpdateMs?: number;
}

export function RiderMap({
  orderStatus,
  riderLocation,
  sellerLocation,
  buyerLocation,
  onRiderLocationUpdate,
  autoUpdateMs = 5000,
}: RiderMapProps) {
  return (
    <DynamicRiderMapInner
      orderStatus={orderStatus}
      riderLocation={riderLocation}
      sellerLocation={sellerLocation}
      buyerLocation={buyerLocation}
      onRiderLocationUpdate={onRiderLocationUpdate}
      autoUpdateMs={autoUpdateMs}
    />
  );
}
