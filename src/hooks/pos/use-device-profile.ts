"use client";

import { useEffect, useState } from "react";
import { detectPOSDevice } from "@/lib/pos-adaptive/device-detection";
import { buildPOSRuntimeProfile } from "@/lib/pos-adaptive/layout-engine";
import { POSRuntimeProfile, PreferredPOSMode } from "@/lib/pos-adaptive/types";

export const usePOSDeviceProfile = (preferredMode: PreferredPOSMode = "desktop") => {
  const [profile, setProfile] = useState<POSRuntimeProfile>(() =>
    buildPOSRuntimeProfile(detectPOSDevice(), preferredMode),
  );

  useEffect(() => {
    const update = () => {
      const detection = detectPOSDevice();
      setProfile(buildPOSRuntimeProfile(detection, preferredMode));
    };

    update();
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
    };
  }, [preferredMode]);

  return profile;
};
