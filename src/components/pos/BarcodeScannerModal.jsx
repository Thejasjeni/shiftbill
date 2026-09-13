import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Barcode, AlertCircle } from 'lucide-react';

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
            'Camera access unavailable or permission not granted. You can enter or tap the demo barcodes below.'
          );
        }
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(startScanner, 250);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
      }
      html5QrCodeRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1E1B4B] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base">Scan Item Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-500/30 aspect-4/3 flex items-center justify-center shadow-inner">
            <div id={qrRegionId} className="w-full h-full"></div>
            
            {/* Overlay target frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-emerald-400/80 rounded-xl relative">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>
                <div className="w-full h-0.5 bg-rose-500/70 absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>

          {scannerError && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Quick Demo Barcodes for testing without physical camera */}
          <div className="mt-4 w-full text-left">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Barcode Presets (Tap to Test)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { code: '8901234567890', label: 'Basmati Rice 5kg' },
                { code: '8909876543210', label: 'Coconut Oil 1L' },
                { code: '8904567890123', label: 'Atta Flour 10kg' }
              ].map(item => (
                <button
                  key={item.code}
                  onClick={() => {
                    onScanSuccessRef.current(item.code);
                    onCloseRef.current();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="mt-4 w-full flex items-center gap-2">
            <input
              type="text"
              placeholder="Or enter barcode number..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  onScanSuccessRef.current(manualCode.trim());
                  onCloseRef.current();
                }
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
