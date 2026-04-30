"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScannerMode } from "@/types/store-config";

type BarcodeDetectorLike = {
  detect: (
    source: HTMLCanvasElement | HTMLVideoElement | ImageBitmapSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtorLike = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

const normalizeBarcodeCandidate = (value: string) =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim();

const isDigitsOnly = (value: string) => /^\d+$/.test(value);

const computeMod10CheckDigit = (body: string) => {
  let sum = 0;
  let positionFromRight = 0;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    const digit = Number(body[index]);
    sum += digit * (positionFromRight % 2 === 0 ? 3 : 1);
    positionFromRight += 1;
  }

  return (10 - (sum % 10)) % 10;
};

const isValidRetailChecksum = (value: string) => {
  if (!isDigitsOnly(value)) {
    return false;
  }

  if (![8, 12, 13].includes(value.length)) {
    return false;
  }

  const body = value.slice(0, -1);
  const checkDigit = Number(value[value.length - 1]);
  return computeMod10CheckDigit(body) === checkDigit;
};

const scoreCandidate = (candidate: string, count: number) => {
  let score = count;
  if (isDigitsOnly(candidate) && [8, 12, 13].includes(candidate.length)) {
    score += isValidRetailChecksum(candidate) ? 4 : -3;
  }

  return score;
};

const selectBestCandidate = (rawCandidates: string[]) => {
  const normalizedCandidates = rawCandidates
    .map((item) => normalizeBarcodeCandidate(item))
    .filter(Boolean);

  if (!normalizedCandidates.length) {
    return "";
  }

  const counts = new Map<string, number>();
  for (const candidate of normalizedCandidates) {
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
  }

  const ranked = Array.from(counts.entries())
    .map(([candidate, count]) => ({
      candidate,
      count,
      score: scoreCandidate(candidate, count),
      isChecksumValid: isValidRetailChecksum(candidate),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.count !== left.count) {
        return right.count - left.count;
      }

      if (right.isChecksumValid !== left.isChecksumValid) {
        return Number(right.isChecksumValid) - Number(left.isChecksumValid);
      }

      return right.candidate.length - left.candidate.length;
    });

  return ranked[0]?.candidate || "";
};

export type ScannerStatusTone = "success" | "info" | "warning" | "error";

interface BarcodeScannerPanelProps {
  modes: ScannerMode[];
  defaultMode: ScannerMode;
  barcodeValue: string;
  onBarcodeValueChange: (value: string) => void;
  onBarcodeSubmit: (barcode: string) => void;
  onServerFrameDecode?: (imageData: string) => Promise<string | null>;
  onStatusChange?: (status: string, tone?: ScannerStatusTone) => void;
}

export function BarcodeScannerPanel({
  modes,
  defaultMode,
  barcodeValue,
  onBarcodeValueChange,
  onBarcodeSubmit,
  onServerFrameDecode,
  onStatusChange,
}: BarcodeScannerPanelProps) {
  const [selectedMode, setSelectedMode] = useState<ScannerMode>(defaultMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const onStatusChangeRef = useRef(onStatusChange);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const lastCameraErrorAtRef = useRef<number>(0);
  const cameraRegionRef = useRef<HTMLDivElement | null>(null);
  const quaggaRef = useRef<{
    default: {
      init: (config: unknown, cb: (err?: unknown) => void) => void;
      start: () => void;
      stop: () => void;
      decodeSingle: (
        config: unknown,
        cb: (result?: { codeResult?: { code?: string } }) => void,
      ) => void;
      offDetected: (handler: (result: unknown) => void) => void;
      onDetected: (handler: (result: unknown) => void) => void;
    };
  } | null>(null);
  const detectedHandlerRef = useRef<((result: unknown) => void) | null>(null);
  const isStartingRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorLike | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoDecodeInFlightRef = useRef(false);
  const lastAutoServerDecodeAtRef = useRef(0);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const emitStatus = useCallback((status: string, tone: ScannerStatusTone = "info") => {
    onStatusChangeRef.current?.(status, tone);
  }, []);

  const orderedModes = useMemo(() => {
    const modeSet = new Set<ScannerMode>(modes);
    return ["hardware", "camera", "manual"].filter((mode) =>
      modeSet.has(mode as ScannerMode),
    ) as ScannerMode[];
  }, [modes]);

  const submitScannedCode = useCallback(
    (rawValue: string) => {
      const scannedText = normalizeBarcodeCandidate(rawValue);

      if (!scannedText) {
        return false;
      }

      if (
        isDigitsOnly(scannedText) &&
        [8, 12, 13].includes(scannedText.length) &&
        !isValidRetailChecksum(scannedText)
      ) {
        emitStatus("Ignored unstable barcode read. Try Scan frame again.", "warning");
        return false;
      }

      const now = Date.now();
      const lastScan = lastScanRef.current;
      const duplicateWithinCooldown =
        lastScan &&
        lastScan.value === scannedText &&
        now - lastScan.at < 1800;

      if (duplicateWithinCooldown) {
        return false;
      }

      lastScanRef.current = {
        value: scannedText,
        at: now,
      };

      onBarcodeValueChange(scannedText);
      onBarcodeSubmit(scannedText);
      emitStatus(`Barcode detected: ${scannedText}`, "success");
      setCameraError(null);
      return true;
    },
    [emitStatus, onBarcodeSubmit, onBarcodeValueChange],
  );

  const decodeCurrentFrame = useCallback(
    async (source: "auto" | "manual" = "manual") => {
      if (source === "auto" && autoDecodeInFlightRef.current) {
        return;
      }

      if (source === "auto") {
        autoDecodeInFlightRef.current = true;
      }

      const detector = barcodeDetectorRef.current;
      const target = cameraRegionRef.current;
      const quagga = quaggaRef.current?.default;

      const decodeWithQuagga = async (canvas: HTMLCanvasElement) => {
        if (!quagga) {
          return "";
        }

        const runDecode = async (src: string, readers: string[], locate: boolean) =>
          new Promise<string>((resolve) => {
            quagga.decodeSingle(
              {
                src,
                numOfWorkers: 0,
                locate,
                locator: {
                  patchSize: "x-large",
                  halfSample: true,
                },
                decoder: {
                  readers,
                },
              },
              (result) => {
                resolve(String(result?.codeResult?.code || ""));
              },
            );
          });

        const makeCenterCrop = () => {
          const crop = document.createElement("canvas");
          const cropCtx = crop.getContext("2d", { willReadFrequently: true });
          if (!cropCtx) {
            return null;
          }

          const sw = Math.floor(canvas.width * 0.72);
          const sh = Math.floor(canvas.height * 0.42);
          const sx = Math.floor((canvas.width - sw) / 2);
          const sy = Math.floor((canvas.height - sh) / 2);

          crop.width = canvas.width;
          crop.height = canvas.height;
          cropCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
          return crop;
        };

        const makeMirrored = () => {
          const mirrored = document.createElement("canvas");
          const mirroredCtx = mirrored.getContext("2d", { willReadFrequently: true });
          if (!mirroredCtx) {
            return null;
          }

          mirrored.width = canvas.width;
          mirrored.height = canvas.height;
          mirroredCtx.translate(mirrored.width, 0);
          mirroredCtx.scale(-1, 1);
          mirroredCtx.drawImage(canvas, 0, 0, mirrored.width, mirrored.height);
          return mirrored;
        };

        const fullSrc = canvas.toDataURL("image/jpeg", 0.94);
        const cropCanvas = makeCenterCrop();
        const cropSrc = cropCanvas?.toDataURL("image/jpeg", 0.94) || "";
        const mirrorCanvas = makeMirrored();
        const mirrorSrc = mirrorCanvas?.toDataURL("image/jpeg", 0.94) || "";

        const passes: Array<{ src: string; readers: string[]; locate: boolean }> = [
          {
            src: fullSrc,
            readers: ["ean_reader", "upc_reader", "upc_e_reader", "ean_8_reader"],
            locate: true,
          },
          {
            src: cropSrc,
            readers: ["ean_reader", "upc_reader", "upc_e_reader", "ean_8_reader"],
            locate: false,
          },
          {
            src: cropSrc,
            readers: ["code_128_reader", "code_39_reader", "codabar_reader", "i2of5_reader"],
            locate: false,
          },
          {
            src: mirrorSrc,
            readers: ["ean_reader", "upc_reader", "upc_e_reader", "ean_8_reader"],
            locate: false,
          },
          {
            src: fullSrc,
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
            locate: true,
          },
        ];

        const decodedCandidates: string[] = [];

        for (const pass of passes) {
          if (!pass.src) {
            continue;
          }

          const decoded = await runDecode(pass.src, pass.readers, pass.locate);
          if (decoded) {
            decodedCandidates.push(decoded);
          }
        }

        return selectBestCandidate(decodedCandidates);
      };

      try {
        if (!target) {
          if (source === "manual") {
            emitStatus("Camera frame not ready yet", "warning");
          }
          return;
        }

        const video = target.querySelector("video");
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
          if (source === "manual") {
            emitStatus("Camera frame not ready yet", "warning");
          }
          return;
        }

        if (!fallbackCanvasRef.current) {
          fallbackCanvasRef.current = document.createElement("canvas");
        }

        const canvas = fallbackCanvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        if (!context) {
          if (source === "manual") {
            emitStatus("Unable to access frame decoder context", "warning");
          }
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (detector) {
          try {
            const detections = await detector.detect(canvas);
            const best = selectBestCandidate(
              detections
                .map((item) => String(item?.rawValue || ""))
                .filter(Boolean),
            );

            if (best && submitScannedCode(best)) {
              return;
            }
          } catch {
            // Fall through to compatibility decoder below.
          }
        }

        if (quagga) {
          const decoded = await decodeWithQuagga(canvas);
          if (decoded && submitScannedCode(decoded)) {
            return;
          }
        }

        const shouldUseServerDecode =
          Boolean(onServerFrameDecode) &&
          (source === "manual" || Date.now() - lastAutoServerDecodeAtRef.current > 2500);

        if (shouldUseServerDecode && onServerFrameDecode) {
          try {
            if (source === "auto") {
              lastAutoServerDecodeAtRef.current = Date.now();
            }

            const serverDecoded = await onServerFrameDecode(
              canvas.toDataURL("image/jpeg", 0.95),
            );

            if (serverDecoded && submitScannedCode(serverDecoded)) {
              if (source === "manual") {
                emitStatus(`Barcode detected by server decode: ${serverDecoded}`, "success");
              }
              return;
            }
          } catch {
            if (source === "manual") {
              emitStatus("Server frame decode failed", "warning");
            }
          }
        }

        if (source === "manual") {
          emitStatus("No barcode found in this frame", "warning");
        }
      } finally {
        if (source === "auto") {
          autoDecodeInFlightRef.current = false;
        }
      }
    },
    [emitStatus, onServerFrameDecode, submitScannedCode],
  );

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(
    async (silent = false) => {
      clearFallbackTimer();
      const quagga = quaggaRef.current?.default;
      const detectedHandler = detectedHandlerRef.current;

      if (quagga) {
        try {
          if (detectedHandler) {
            quagga.offDetected(detectedHandler);
          }
          quagga.stop();
        } catch {
          // Ignore shutdown errors from stale camera sessions.
        }
      }

      setCameraActive(false);
      isStartingRef.current = false;
      if (!silent) {
        emitStatus("Camera scanner stopped", "info");
      }
    },
    [clearFallbackTimer, emitStatus],
  );

  useEffect(() => {
    return () => {
      stopCamera(true);
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (cameraActive || isStartingRef.current) {
      return;
    }

    setCameraError(null);
    isStartingRef.current = true;

    try {
      const target = cameraRegionRef.current;
      if (!target) {
        throw new Error("Camera region unavailable");
      }

      target.innerHTML = "";

      if (!quaggaRef.current) {
        quaggaRef.current = await import("@ericblade/quagga2");
      }

      const quagga = quaggaRef.current.default;

      const detectorCtor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtorLike })
        .BarcodeDetector;

      if (detectorCtor) {
        barcodeDetectorRef.current = new detectorCtor({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "codabar",
            "itf",
          ],
        });
      } else {
        barcodeDetectorRef.current = null;
      }

      const handleDetected = (result: unknown) => {
        const rawCode =
          result && typeof result === "object" && "codeResult" in result
            ? (result as { codeResult?: { code?: string } }).codeResult?.code
            : "";

        submitScannedCode(String(rawCode || ""));
      };

      await new Promise<void>((resolve, reject) => {
        quagga.init(
          {
            inputStream: {
              type: "LiveStream",
              target,
              constraints: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              area: {
                top: "28%",
                right: "15%",
                left: "15%",
                bottom: "28%",
              },
              willReadFrequently: true,
            },
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
            locate: true,
            numOfWorkers: Math.max(2, (navigator.hardwareConcurrency || 4) - 1),
            frequency: 6,
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

      clearFallbackTimer();
      fallbackTimerRef.current = window.setInterval(() => {
        void decodeCurrentFrame("auto");
      }, 700);

      setCameraActive(true);
      lastCameraErrorAtRef.current = Date.now();
      emitStatus("Camera scanner active", "info");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to start camera scanner. Check camera permission.";
      setCameraError(message);
      emitStatus("Unable to start camera scanner", "error");
    } finally {
      isStartingRef.current = false;
    }
  }, [
    cameraActive,
    clearFallbackTimer,
    decodeCurrentFrame,
    emitStatus,
    submitScannedCode,
  ]);

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-white/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {orderedModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setSelectedMode(mode);
              if (mode !== "camera") {
                stopCamera();
              }
              emitStatus(
                mode === "hardware"
                  ? "Hardware scanner mode ready"
                  : mode === "manual"
                    ? "Manual scanner mode ready"
                    : "Camera scanner mode selected",
                "info",
              );
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              selectedMode === mode
                ? "bg-brand-600 text-white"
                : "bg-brand-100 text-brand-700 hover:bg-brand-200"
            }`}
          >
            {mode} mode
          </button>
        ))}
      </div>

      {selectedMode === "camera" ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border bg-black/90">
            <div
              ref={cameraRegionRef}
              className="relative h-56 w-full sm:h-64 md:h-72 [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
            />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative h-[22%] w-[88%] max-w-2xl rounded-md border border-white/80 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.2)] sm:h-[20%]">
                <span className="absolute -left-0.5 -top-0.5 h-5 w-5 border-l-2 border-t-2 border-emerald-300" />
                <span className="absolute -right-0.5 -top-0.5 h-5 w-5 border-r-2 border-t-2 border-emerald-300" />
                <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 border-b-2 border-l-2 border-emerald-300" />
                <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 border-b-2 border-r-2 border-emerald-300" />
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-300/80" />
              </div>
            </div>
            {!cameraActive ? (
              <div className="pointer-events-none -mt-56 flex h-56 items-center justify-center text-sm text-gray-300 sm:-mt-64 sm:h-64 md:-mt-72 md:h-72">
                Camera is off. Click Start camera.
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void startCamera();
              }}
              disabled={cameraActive}
            >
              Start camera
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void stopCamera();
              }}
            >
              Stop camera
            </Button>
          </div>

          {cameraError ? (
            <p className="text-xs text-red-600">{cameraError}</p>
          ) : (
            <p className="text-xs text-gray-600">
              Point the camera at a barcode to auto-add matching products.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Input
            className="border-brand-200 focus-visible:border-brand-500 focus-visible:ring-brand-100"
            placeholder={
              selectedMode === "hardware"
                ? "Scan with hardware scanner and press Enter"
                : "Type barcode manually and press Enter"
            }
            value={barcodeValue}
            onChange={(event) => onBarcodeValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              const barcode = barcodeValue.trim();
              if (!barcode) {
                return;
              }

              onBarcodeSubmit(barcode);
              emitStatus("Barcode input submitted", "info");
            }}
          />
          <p className="text-xs text-gray-600">
            {selectedMode === "hardware"
              ? "USB/Bluetooth scanners send keyboard input to this field."
              : "Manual mode supports typed barcode lookup and add-to-cart."}
          </p>
        </div>
      )}
    </div>
  );
}
