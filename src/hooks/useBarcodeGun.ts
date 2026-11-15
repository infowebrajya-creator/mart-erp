import { useEffect, useRef } from 'react';

interface UseBarcodeGunOptions {
  onScan: (barcode: string) => void;
  maxIntervalMs?: number; // Maximum time between keystrokes to be considered a scanner burst (typical barcode guns emit at 10-25ms)
  minLength?: number;     // Minimum length of scanned barcode (usually 4 to 18 characters)
  enabled?: boolean;
}

/**
 * Global Hardware USB / Bluetooth Barcode Gun Interceptor Hook.
 * Listens for rapid character bursts from hardware scanner guns and triggers onScan,
 * ensuring seamless scanning on laptops/counter PCs regardless of which element is focused.
 */
export function useBarcodeGun({
  onScan,
  maxIntervalMs = 45,
  minLength = 3,
  enabled = true
}: UseBarcodeGunOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier keys (Ctrl, Alt, Meta, Tab, Esc)
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab' || e.key === 'Escape') {
        bufferRef.current = '';
        return;
      }

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // When Enter is received: check if the accumulated buffer was a rapid scanner burst
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';

          // If the event target was a standard input, prevent standard form submit if it was a scanner burst
          if (interval <= maxIntervalMs * 2) {
            e.preventDefault();
            e.stopPropagation();
            onScanRef.current(scannedCode);
          }
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        if (interval > maxIntervalMs && bufferRef.current.length > 0) {
          // Time gap too large: user is human typing or paused, clear old buffer
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minLength]);
}

