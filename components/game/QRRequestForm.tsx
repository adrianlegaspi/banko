'use client'

import { Stack, NumberInput, Paper, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRRequestFormProps {
    roomCode: string;
    currentPlayerId: string;
}

export default function QRRequestForm({ roomCode, currentPlayerId }: QRRequestFormProps) {
    const [amount, setAmount] = useState<number | string | null>(null);
    const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
        if (amount && Number(amount) > 0) {
            const origin = window.location.origin;
            const url = `${origin}/room/${roomCode}/pay?to=${currentPlayerId}&amount=${amount}`;
            setQrUrl(url);
        } else {
            setQrUrl('');
        }
    }, [amount, roomCode, currentPlayerId]);

    return (
        <Stack align="center" gap="md">
            <NumberInput
                label="Amount to Request"
                placeholder="0"
                value={amount === null ? '' : amount}
                onChange={setAmount}
                min={0}
                w="100%"
            />

            {qrUrl ? (
                <Paper p="md" withBorder radius="md" bg="white">
                    <QRCodeSVG value={qrUrl} size={200} />
                </Paper>
            ) : (
                <Paper p="md" withBorder radius="md" bg="gray.1" w={200} h={200} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text c="dimmed" size="sm">Enter amount to generate QR</Text>
                </Paper>
            )}

            {qrUrl && (
                <Text size="xs" c="dimmed" ta="center" style={{ wordBreak: 'break-all' }}>
                    Scan to pay
                </Text>
            )}
        </Stack>
    );
}
