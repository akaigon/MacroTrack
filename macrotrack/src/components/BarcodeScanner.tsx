// =============================================================================
// BarcodeScanner.tsx — scan a product barcode with the device camera.
//
// Uses @zxing/browser to read the camera stream and decode barcodes. When a
// code is found, we call onDetected(code) and stop the camera. The camera only
// works over HTTPS or on localhost (a browser security rule) — on Vercel that's
// automatic.
// =============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let stopped = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, _err, ctrl) => {
        controls = ctrl;
        if (stopped) return;
        if (result) {
          stopped = true;
          ctrl.stop();
          onDetected(result.getText());
        }
      })
      .catch(() => {
        setError(
          "Couldn't start the camera. Check that you've allowed camera access (and that you're on https or localhost)."
        );
      });

    // Cleanup: stop the camera when this component goes away.
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="font-medium">Scan a barcode</span>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm bg-white/15"
        >
          Close
        </button>
      </div>

      <div className="relative flex-1">
        {/* The live camera preview. */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {/* A simple aiming frame overlay. */}
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-72 rounded-xl border-2 border-white/80" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
            {error}
          </div>
        )}
      </div>

      <p className="p-4 text-center text-sm text-white/70">
        Point the camera at a product barcode.
      </p>
    </div>
  );
}
