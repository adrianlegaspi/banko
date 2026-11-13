'use client';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { parsePaymentLink } from '@/lib/payment-link';
export default function ScanQRForm({ roomCode }: { roomCode: string }) {
  const [error, setError] = useState('');
  const [cameraIndex, setCameraIndex] = useState(0);
  const [cameraCount, setCameraCount] = useState(0);
  const [ready, setReady] = useState(false);
  const scannerId = 'payment-scanner-' + useId().replaceAll(':', '');
  const router = useRouter();
  useEffect(() => {
    let disposed = false;
    let scanner: import('html5-qrcode').Html5Qrcode | undefined;
    let navigating = false;
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices)
          throw new Error(
            'Camera access needs HTTPS and a browser with camera support.',
          );
        const { Html5Qrcode } = await import('html5-qrcode');
        const cameras = await Html5Qrcode.getCameras();
        if (disposed) return;
        if (!cameras.length)
          throw new Error('No camera found. Open a payment link instead.');
        setCameraCount(cameras.length);
        scanner = new Html5Qrcode(scannerId);
        await scanner.start(
          cameras[cameraIndex % cameras.length].id,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (navigating || disposed) return;
            try {
              const payment = parsePaymentLink(
                decodedText,
                window.location.origin,
                roomCode,
              );
              navigating = true;
              if (scanner?.isScanning) await scanner.stop();
              if (!disposed) router.push(payment.path);
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : 'Invalid payment QR.',
              );
            }
          },
          () => {},
        );
        if (disposed) {
          if (scanner.isScanning) await scanner.stop();
          return;
        }
        setReady(true);
      } catch (failure) {
        if (!disposed)
          setError(
            failure instanceof Error && failure.name === 'NotAllowedError'
              ? 'Camera permission denied. Allow access, then retry.'
              : failure instanceof Error
                ? failure.message
                : 'Could not start camera. Check permissions and retry.',
          );
      }
    }
    void start();
    return () => {
      disposed = true;
      if (scanner?.isScanning) void scanner.stop().catch(() => {});
    };
  }, [cameraIndex, roomCode, router, scannerId]);
  return (
    <div className="form-stack">
      <div id={scannerId} className="min-h-72 overflow-hidden rounded-xl" />
      {!ready && !error && <p role="status">Starting camera...</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Scan a QR from this room. You will review the payment before sending.
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          setError('');
          setReady(false);
          setCameraIndex((previous) => previous + 1);
        }}
      >
        {cameraCount > 1 ? 'Switch camera / Retry' : 'Retry camera'}
      </Button>
    </div>
  );
}
