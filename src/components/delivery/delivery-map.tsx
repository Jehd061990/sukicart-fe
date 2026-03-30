"use client";

import dynamic from "next/dynamic";
import { GeoLocation } from "@/types/delivery";

const DynamicLeafletMap = dynamic(
  () =>
    import("@/components/delivery/leaflet-map-inner").then(
      (mod) => mod.DeliveryMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

interface DeliveryMapProps {
  location: GeoLocation;
}

export function DeliveryMap({ location }: DeliveryMapProps) {
  return <DynamicLeafletMap location={location} />;
}
