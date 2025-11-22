'use client'

import { Stack, Button, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { createTransaction } from '@/app/actions';

interface ScanQRFormProps {
    onClose: () => void;
    roomId: string;
    currentPlayerId: string;
}

export default function ScanQRForm({ onClose, roomId, currentPlayerId }: ScanQRFormProps) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);
    const [cameraIndex, setCameraIndex] = useState(0);

    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;

        const checkCameraSupport = async () => {
            // Check if we're on HTTPS or localhost
            const isSecure = window.location.protocol === 'https:' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';

            if (!isSecure) {
                setError("Camera access requires HTTPS. Please use localhost or access via HTTPS.");
                return false;
            }

            // Check if MediaDevices API is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Camera access is not supported by your browser.");
                return false;
            }

            return true;
        };

        const startScanning = async () => {
            const isSupported = await checkCameraSupport();
            if (!isSupported) {
                return;
            }

            try {
                // Request camera permission explicitly
                await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

                html5QrCode = new Html5Qrcode("reader");

                // Get available cameras
                const devices = await Html5Qrcode.getCameras();
                setCameras(devices);

                if (devices && devices.length > 0) {
                    setScanning(true);

                    // Use the camera at current index
                    const cameraId = devices[cameraIndex % devices.length].id;

                    // Ensure element exists before starting
                    if (!document.getElementById('reader')) {
                        console.warn("Reader element not found, skipping start");
                        return;
                    }

                    await html5QrCode.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 }
                        },
                        async (decodedText) => {
                            console.log(`Scan result: ${decodedText}`);

                            // Stop scanning first
                            await html5QrCode?.stop();
                            onClose();

                            // Parse the QR code data
                            try {
                                const url = new URL(decodedText);
                                const searchParams = new URLSearchParams(url.search);
                                const toPlayerId = searchParams.get('to');
                                const amount = searchParams.get('amount');

                                if (url.pathname.includes('/pay') && toPlayerId && amount) {
                                    // Process payment directly without navigation
                                    try {
                                        await createTransaction(
                                            roomId,
                                            'player_to_player',
                                            Number(amount),
                                            'QR Payment',
                                            currentPlayerId,
                                            toPlayerId
                                        );
                                        alert(`Successfully paid $${amount}!`);
                                    } catch (error) {
                                        console.error('Payment failed:', error);
                                        alert('Payment failed. Please try again.');
                                    }
                                } else {
                                    alert('Invalid Banko QR Code');
                                }
                            } catch (e) {
                                console.error('Failed to parse QR code:', e);
                                alert('Invalid QR Code format');
                            }
                        },
                        (errorMessage) => {
                            // Ignore scanning errors (happens continuously while scanning)
                        }
                    );
                } else {
                    setError("No cameras found on this device.");
                }
            } catch (err: any) {
                console.error("Error starting scanner", err);
                if (err.name === 'NotAllowedError') {
                    setError("Camera permission denied. Please allow camera access and try again.");
                } else if (err.name === 'NotFoundError') {
                    setError("No camera found on this device.");
                } else if (err.message?.includes('streaming not supported')) {
                    setError("Camera streaming not supported. Please use HTTPS or localhost.");
                } else {
                    setError(`Camera error: ${err.message || 'Could not access camera'}`);
                }
                setScanning(false);
            }
        };

        startScanning();

        return () => {
            if (html5QrCode?.isScanning) {
                html5QrCode.stop().catch(err => console.error("Failed to stop scanner", err));
            }
        };
    }, [onClose, router, roomId, currentPlayerId, cameraIndex]);

    return (
        <Stack align="center" gap="md">
            <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>
            {!scanning && !error && <Text size="sm">Initializing camera...</Text>}
            {error && (
                <Stack gap="xs" align="center">
                    <Text c="red" size="sm" ta="center">{error}</Text>
                    {error.includes('HTTPS') && (
                        <Text size="xs" c="dimmed" ta="center">
                            Access the app via localhost:3000 or use HTTPS to enable camera
                        </Text>
                    )}
                </Stack>
            )}

            {cameras.length > 1 && (
                <Button
                    variant="light"
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => setCameraIndex(prev => prev + 1)}
                >
                    Switch Camera
                </Button>
            )}
            {scanning && <Text size="xs" c="dimmed">Point camera at a Banko QR code</Text>}
        </Stack>
    );
}
