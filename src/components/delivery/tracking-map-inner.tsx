"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { GeoLocation } from "@/types/delivery";
import { FALLBACK_LOCATION, hasCoords } from "@/lib/delivery/tracking";

interface TrackingMapInnerProps {
  riderLocation?: GeoLocation | null;
  sellerLocation?: GeoLocation | null;
  buyerLocation?: GeoLocation | null;
  targetLocation?: GeoLocation | null;
}

function RecenterMap({ focusLocation }: { focusLocation: GeoLocation }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([focusLocation.lat, focusLocation.lng], map.getZoom(), {
      duration: 0.7,
    });
  }, [focusLocation, map]);

  return null;
}

function LocationMarker({
  location,
  color,
  label,
  radius = 9,
}: {
  location?: GeoLocation | null;
  color: string;
  label: string;
  radius?: number;
}) {
  if (!hasCoords(location)) {
    return null;
  }

  return (
    <CircleMarker
      center={[location!.lat, location!.lng]}
      radius={radius}
      pathOptions={{ color, fillOpacity: 0.8 }}
    >
      <Tooltip direction="top" offset={[0, -8]} permanent>
        {label}
      </Tooltip>
    </CircleMarker>
  );
}

export function TrackingMapInner({
  riderLocation,
  sellerLocation,
  buyerLocation,
  targetLocation,
}: TrackingMapInnerProps) {
  const focusLocation =
    (hasCoords(riderLocation) && riderLocation) ||
    (hasCoords(targetLocation) && targetLocation) ||
    (hasCoords(sellerLocation) && sellerLocation) ||
    (hasCoords(buyerLocation) && buyerLocation) ||
    FALLBACK_LOCATION;

  return (
    <MapContainer
      center={[focusLocation.lat, focusLocation.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-105 w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker
        location={sellerLocation}
        color="#f97316"
        label="Seller"
      />
      <LocationMarker location={buyerLocation} color="#2563eb" label="Buyer" />
      <LocationMarker
        location={riderLocation}
        color="#16a34a"
        label="Rider"
        radius={10}
      />
      <RecenterMap focusLocation={focusLocation} />
    </MapContainer>
  );
}
