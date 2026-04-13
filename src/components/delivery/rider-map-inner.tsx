"use client";

import { useEffect, useMemo, useState } from "react";
import { divIcon, type DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import {
  FALLBACK_LOCATION,
  buildGoogleMapsDirectionUrl,
  hasCoords,
} from "@/lib/delivery/tracking";
import { GeoLocation } from "@/types/delivery";

interface RiderMapInnerProps {
  orderStatus?: string;
  riderLocation?: GeoLocation | null;
  sellerLocation?: GeoLocation | null;
  buyerLocation?: GeoLocation | null;
  onRiderLocationUpdate?: (location: GeoLocation) => void | Promise<void>;
  autoUpdateMs?: number;
}

function RecenterMap({ center }: { center: GeoLocation }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

const createRoleIcon = (label: string, bgColor: string): DivIcon =>
  divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;border:2px solid #ffffff;background:${bgColor};color:#ffffff;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

function RoleMarker({
  location,
  icon,
  label,
}: {
  location: GeoLocation;
  icon: DivIcon;
  label: string;
}) {
  return (
    <Marker position={[location.lat, location.lng]} icon={icon}>
      <Popup>{label}</Popup>
    </Marker>
  );
}

export function RiderMapInner({
  orderStatus,
  riderLocation,
  sellerLocation,
  buyerLocation,
  onRiderLocationUpdate,
  autoUpdateMs = 5000,
}: RiderMapInnerProps) {
  const [gpsRiderLocation, setGpsRiderLocation] = useState<GeoLocation | null>(
    null,
  );

  const liveRiderLocation = useMemo(
    () =>
      (hasCoords(gpsRiderLocation) && gpsRiderLocation) ||
      (hasCoords(riderLocation) && riderLocation) ||
      FALLBACK_LOCATION,
    [gpsRiderLocation, riderLocation],
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const nextLocation: GeoLocation = {
            lat: coords.latitude,
            lng: coords.longitude,
            updatedAt: new Date().toISOString(),
          };

          setGpsRiderLocation(nextLocation);
          void onRiderLocationUpdate?.(nextLocation);
        },
        () => {
          // Keep the last known rider position if geolocation fails.
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
        },
      );
    }, autoUpdateMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoUpdateMs, onRiderLocationUpdate]);

  const normalizedStatus = String(orderStatus || "").toUpperCase();
  const showSeller = normalizedStatus !== "PICKED_UP";
  const showBuyer = normalizedStatus === "PICKED_UP";

  const destinationLocation = showBuyer ? buyerLocation : sellerLocation;
  const navigateUrl = buildGoogleMapsDirectionUrl(destinationLocation);

  const markerIcons = useMemo(
    () => ({
      rider: createRoleIcon("R", "#16a34a"),
      seller: createRoleIcon("S", "#f97316"),
      buyer: createRoleIcon("B", "#2563eb"),
    }),
    [],
  );

  return (
    <div className="space-y-3">
      <MapContainer
        center={[liveRiderLocation.lat, liveRiderLocation.lng]}
        zoom={15}
        scrollWheelZoom
        className="h-105 w-full rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RoleMarker
          location={liveRiderLocation}
          icon={markerIcons.rider}
          label="Rider"
        />

        {showSeller && hasCoords(sellerLocation) ? (
          <RoleMarker
            location={sellerLocation!}
            icon={markerIcons.seller}
            label="Seller"
          />
        ) : null}

        {showBuyer && hasCoords(buyerLocation) ? (
          <RoleMarker
            location={buyerLocation!}
            icon={markerIcons.buyer}
            label="Buyer"
          />
        ) : null}

        <RecenterMap center={liveRiderLocation} />
      </MapContainer>

      <Button
        variant="outline"
        onClick={() => {
          if (navigateUrl) {
            window.open(navigateUrl, "_blank", "noopener,noreferrer");
          }
        }}
        disabled={!navigateUrl}
      >
        Navigate
      </Button>
    </div>
  );
}
