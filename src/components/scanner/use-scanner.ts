"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QuaggaModule = typeof import("@ericblade/quagga2");

type DetectionResult = {
  codeResult?: {
    code?: string;
  };
};

interface UseScannerOptions {
  onDetected: (code: string) => void;
}

const isDimensionQuaggaError = (value: unknown) => {
  const message = value instanceof Error ? value.message : String(value || "");
  return /dimension|width|height|nan/i.test(message);
};

export const useScanner = ({ onDetected }: UseScannerOptions) => {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const quaggaModuleRef = useRef<QuaggaModule | null>(null);
  const detectedHandlerRef = useRef<((result: DetectionResult) => void) | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const waitForContainerSize = useCallback(async (target: HTMLDivElement) => {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const rect = target.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
        return true;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50);
      });
    }

    return false;
  }, []);

  const initQuagga = useCallback(
    async (
      quagga: QuaggaModule["default"],
      target: HTMLDivElement,
      mode: "primary" | "safe" = "primary",
    ) => {
      const safeMode = mode === "safe";
      await new Promise<void>((resolve, reject) => {
        quagga.init(
          {
            inputStream: {
              type: "LiveStream",
              target,
              constraints: safeMode
                ? {
                    facingMode: "environment",
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                  }
                : {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  },
            },
            locate: !safeMode,
            frequency: safeMode ? 6 : 8,
            numOfWorkers: safeMode
              ? 0
              : Math.max(2, (navigator.hardwareConcurrency || 4) - 1),
            ...(safeMode
              ? {}
              : {
                  locator: {
                    patchSize: "x-large",
                    halfSample: true,
                  },
                }),
            decoder: {
              readers: safeMode
                ? ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader"]
                : [
                    "ean_reader",
                    "ean_8_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "code_128_reader",
                    "code_39_reader",
                    "codabar_reader",
                    "i2of5_reader",
                  ],
            },
          },
          (err?: unknown) => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          },
        );
      });
    },
    [],
  );

  const stop = useCallback(async () => {
    const quagga = quaggaModuleRef.current?.default;
    if (quagga) {
      try {
        if (detectedHandlerRef.current) {
          quagga.offDetected(detectedHandlerRef.current);
        }
        quagga.stop();
      } catch {
        // Ignore stop errors from stale streams.
      }
    }

    setTorchOn(false);
    setTorchSupported(false);
    setIsActive(false);
    videoTrackRef.current = null;
  }, []);

  const detectTorchSupport = useCallback(() => {
    const video = scannerRef.current?.querySelector("video") as HTMLVideoElement | null;
    const track = video?.srcObject
      ? (video.srcObject as MediaStream).getVideoTracks()[0] || null
      : null;

    videoTrackRef.current = track;

    const caps = track?.getCapabilities?.() as MediaTrackCapabilities | undefined;
    const hasTorch = Boolean(caps && "torch" in caps);

    setTorchSupported(hasTorch);
    if (!hasTorch) {
      setTorchOn(false);
    }
  }, []);

  const start = useCallback(async () => {
    if (!scannerRef.current) {
      return;
    }

    setError("");

    try {
      if (!quaggaModuleRef.current) {
        quaggaModuleRef.current = await import("@ericblade/quagga2");
      }

      const quagga = quaggaModuleRef.current.default;
      const target = scannerRef.current;
      target.innerHTML = "";
      const hasSize = await waitForContainerSize(target);
      if (!hasSize) {
        throw new Error("Scanner viewport is not ready yet. Please reopen scanner.");
      }

      const handleDetected = (result: DetectionResult) => {
        const code = String(result?.codeResult?.code || "").trim();
        if (code) {
          onDetected(code);
        }
      };

      try {
        await initQuagga(quagga, target, "safe");
      } catch (safeError) {
        if (!isDimensionQuaggaError(safeError)) {
          throw safeError;
        }

        // Some mobile browsers report this during early stream setup.
        try {
          quagga.stop();
        } catch {
          // Ignore cleanup errors before retry.
        }

        target.innerHTML = "";
        const retryHasSize = await waitForContainerSize(target);
        if (!retryHasSize) {
          throw new Error("Scanner viewport could not be measured for camera startup.");
        }
        await initQuagga(quagga, target, "safe");
      }

      detectedHandlerRef.current = handleDetected;
      quagga.onDetected(handleDetected);
      quagga.start();
      setIsActive(true);

      window.setTimeout(() => {
        detectTorchSupport();
      }, 300);
    } catch (err) {
      if (isDimensionQuaggaError(err) && scannerRef.current?.querySelector("video")) {
        setError("");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start camera scanner",
      );
    }
  }, [detectTorchSupport, initQuagga, onDetected, waitForContainerSize]);

  const toggleTorch = useCallback(async () => {
    if (!videoTrackRef.current || !torchSupported) {
      return;
    }

    const next = !torchOn;

    try {
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: next }],
      } as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setError("Torch toggle is not supported on this device");
    }
  }, [torchOn, torchSupported]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return {
    scannerRef,
    isActive,
    error,
    start,
    stop,
    torchOn,
    torchSupported,
    toggleTorch,
  };
};
