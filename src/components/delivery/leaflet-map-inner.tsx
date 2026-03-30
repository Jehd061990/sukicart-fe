"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import { GeoLocation } from "@/types/delivery";

interface DeliveryMapInnerProps {
  location: GeoLocation;
}

function RecenterMap({ location }: { location: GeoLocation }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([location.lat, location.lng], map.getZoom(), { duration: 0.8 });
  }, [location, map]);

  return null;
}

export function DeliveryMapInner({ location }: DeliveryMapInnerProps) {
  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={15}
      scrollWheelZoom
      className="h-[420px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={10}
        pathOptions={{ color: "#ef4444" }}
      />
      <RecenterMap location={location} />
    </MapContainer>
  );
}
