"use client";

import { useEffect, useMemo, useState } from "react";
import { icon, type Icon } from "leaflet";
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

const createAssetMarkerIcon = (iconUrl: string): Icon =>
  icon({
    iconUrl,
    iconSize: [42, 52],
    iconAnchor: [21, 50],
    popupAnchor: [0, -44],
  });

function RoleMarker({
  location,
  icon,
  label,
}: {
  location: GeoLocation;
  icon: Icon;
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
  const showBuyer = [
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "ARRIVED_AT_BUYER",
    "DELIVERED",
    "COMPLETED",
  ].includes(normalizedStatus);
  const showSeller = !showBuyer;

  const destinationLocation = showBuyer ? buyerLocation : sellerLocation;
  const navigateUrl = buildGoogleMapsDirectionUrl(destinationLocation);

  const markerIcons = useMemo(
    () => ({
      rider: createAssetMarkerIcon("/icons/rider-motorcycle-marker.svg"),
      seller: createAssetMarkerIcon("/icons/seller-store-marker.svg"),
      buyer: createAssetMarkerIcon("/icons/buyer-marker.svg"),
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
