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

export const useScanner = ({ onDetected }: UseScannerOptions) => {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const quaggaModuleRef = useRef<QuaggaModule | null>(null);
  const detectedHandlerRef = useRef<((result: DetectionResult) => void) | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

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

      const handleDetected = (result: DetectionResult) => {
        const code = String(result?.codeResult?.code || "").trim();
        if (code) {
          onDetected(code);
        }
      };

      await new Promise<void>((resolve, reject) => {
        quagga.init(
          {
            inputStream: {
              type: "LiveStream",
              target,
              constraints: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              area: {
                top: "22%",
                right: "10%",
                left: "10%",
                bottom: "22%",
              },
            },
            locate: true,
            frequency: 8,
            numOfWorkers: Math.max(2, (navigator.hardwareConcurrency || 4) - 1),
            locator: {
              patchSize: "x-large",
              halfSample: true,
            },
            decoder: {
              readers: [
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

      detectedHandlerRef.current = handleDetected;
      quagga.onDetected(handleDetected);
      quagga.start();
      setIsActive(true);

      window.setTimeout(() => {
        detectTorchSupport();
      }, 300);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start camera scanner",
      );
    }
  }, [detectTorchSupport, onDetected]);

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
