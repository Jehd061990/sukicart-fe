"use client";

import { useEffect } from "react";
import { icon } from "leaflet";
import {
  MapContainer,
  Marker,
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

const sellerMarkerIcon = icon({
  iconUrl: "/icons/seller-store-marker.svg",
  iconSize: [42, 52],
  iconAnchor: [21, 50],
  tooltipAnchor: [0, -40],
});

const riderMarkerIcon = icon({
  iconUrl: "/icons/rider-motorcycle-marker.svg",
  iconSize: [42, 52],
  iconAnchor: [21, 50],
  tooltipAnchor: [0, -40],
});

const buyerMarkerIcon = icon({
  iconUrl: "/icons/buyer-marker.svg",
  iconSize: [42, 52],
  iconAnchor: [21, 50],
  tooltipAnchor: [0, -40],
});

function IconLocationMarker({
  location,
  label,
  markerIcon,
}: {
  location?: GeoLocation | null;
  label: string;
  markerIcon: ReturnType<typeof icon>;
}) {
  if (!hasCoords(location)) {
    return null;
  }

  return (
    <Marker position={[location!.lat, location!.lng]} icon={markerIcon}>
      <Tooltip direction="top" offset={[0, -8]} permanent>
        {label}
      </Tooltip>
    </Marker>
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
      <IconLocationMarker
        location={sellerLocation}
        label="Seller"
        markerIcon={sellerMarkerIcon}
      />
      <IconLocationMarker
        location={buyerLocation}
        label="Buyer"
        markerIcon={buyerMarkerIcon}
      />
      <IconLocationMarker
        location={riderLocation}
        label="Rider"
        markerIcon={riderMarkerIcon}
      />
      <RecenterMap focusLocation={focusLocation} />
    </MapContainer>
  );
}
