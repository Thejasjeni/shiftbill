import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Barcode, AlertCircle } from 'lucide-react';
import { BUTTON, DIALOG, FIELD, LABEL } from '../ui/controls';

// Sample codes for trying the flow without a physical barcode to hand.
const SAMPLE_CODES = [
  { code: '8901234567890', label: 'Basmati Rice 5kg' },
  { code: '8909876543210', label: 'Coconut Oil 1L' },
  { code: '8904567890123', label: 'Atta Flour 10kg' }
];

export default function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scannerError, setScannerError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const qrRegionId = 'html5qr-code-full-region';
  const html5QrCodeRef = useRef(null);

  // Keep latest callbacks in refs so the scanner uses fresh handlers
  // without restarting the camera on every parent re-render.
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onCloseRef.current = onClose;
  }, [onScanSuccess, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let hasFired = false;

    const startScanner = async () => {
      try {
        setScannerError(null);
        const scanner = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted && !hasFired) {
              hasFired = true; // prevent duplicate scans from burst frames
              if (navigator.vibrate) navigator.vibrate(80);
              onScanSuccessRef.current(decodedText);
              onCloseRef.current();
            }
          },
          (_errorMessage) => {
            // Ignore per-frame decode warnings (normal for continuous scanning)
          }
        );

        if (isMounted) setIsScanning(true);
      } catch (err) {
        console.warn('Camera error or permission denied:', err);
        if (isMounted) {
          setScannerError(
            'No camera access. Allow the camera for this site, or type the barcode number below.'
          );
        }
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(startScanner, 250);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      // `stop()` throws SYNCHRONOUSLY when the camera never started — denied
      // permission, no camera, or closed before `start()` resolved. A rejected
      // promise is handled by `.catch`, but a sync throw here would escape an
      // unmount cleanup and take the whole app down with it, so it is caught.
      if (scanner) {
        try {
          Promise.resolve(scanner.stop())
            .then(() => scanner.clear())
            .catch(() => {});
        } catch {
          /* never reached SCANNING — nothing to release */
        }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const submitManual = () => {
    if (!manualCode.trim()) return;
    onScanSuccessRef.current(manualCode.trim());
    onCloseRef.current();
  };

  return (
    <div className={DIALOG.overlaySheet}>
      <div className={`${DIALOG.cardSheet} flex max-h-[92vh] flex-col sm:max-w-md`}>
        {/* Header */}
        <div className={DIALOG.headerSheet}>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[var(--color-in-bright)]" />
            <h3 className={DIALOG.title}>Scan a barcode</h3>
          </div>
          <button onClick={onClose} className={DIALOG.close} aria-label="Close scanner">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="flex flex-col items-center overflow-y-auto p-4">
          <div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-slate-900 ring-1 ring-[var(--color-brand)]/30">
            <div id={qrRegionId} className="h-full w-full"></div>

            {/* Overlay target frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-32 w-64 rounded-[var(--radius-control)] border-2 border-emerald-400/80">
                <div className="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-emerald-400"></div>
                <div className="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-emerald-400"></div>
                <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-emerald-400"></div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-emerald-400"></div>
                <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 animate-pulse bg-[var(--color-danger)]/70"></div>
              </div>
            </div>
          </div>

          {/* Status: what the camera is doing right now */}
          <p className="mt-2 text-micro text-ink-muted" role="status">
            {isScanning ? 'Hold the barcode inside the frame — it scans by itself.' : 'Starting the camera…'}
          </p>

          {scannerError && (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--color-warn)]/10 px-3 py-2 text-left text-micro text-[var(--color-warn)] ring-1 ring-[var(--color-warn)]/25">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Sample codes for trying the flow without a physical barcode */}
          <div className="mt-4 w-full text-left">
            <span className={LABEL}>No barcode to hand? Try one of these</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_CODES.map(item => (
                <button
                  key={item.code}
                  onClick={() => {
                    onScanSuccessRef.current(item.code);
                    onCloseRef.current();
                  }}
                  className="flex items-center gap-1 rounded-[var(--radius-control)] bg-[var(--color-brand)]/10 px-2.5 py-1 text-micro font-bold text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/20 transition-colors hover:bg-[var(--color-brand)]/15 cursor-pointer"
                >
                  <Barcode className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="mt-4 flex w-full items-center gap-2">
            <input
              type="text"
              placeholder="Or type the barcode number…"
              aria-label="Barcode number"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitManual(); }}
              className={`${FIELD} num flex-1`}
            />
            <button onClick={submitManual} className={BUTTON.primary}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
