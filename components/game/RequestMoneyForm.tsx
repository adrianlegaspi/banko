'use client'

import { Stack, Text, NumberInput, Textarea, Button } from '@mantine/core';
import { useState, useEffect } from 'react';
import { createPaymentRequest } from '@/app/actions';
import PlayerSelector from '@/components/PlayerSelector';
import type { Player } from '@/app/actions';

interface RequestMoneyFormProps {
    roomId: string;
    players: Player[];
    currentPlayerId: string;
    onClose: () => void;
    modalOpen: boolean;
    initialPayerId: string | null;
}

export default function RequestMoneyForm({
    roomId,
    players,
    currentPlayerId,
    onClose,
    modalOpen,
    initialPayerId
}: RequestMoneyFormProps) {
    const [amount, setAmount] = useState<number | string | null>(null);
    const [fromPlayerId, setFromPlayerId] = useState<string | null>(initialPayerId || null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (modalOpen) {
            setFromPlayerId(initialPayerId || null);
        } else {
            setAmount(null);
            setFromPlayerId(null);
            setDescription('');
        }
    }, [modalOpen, initialPayerId]);

    const handleRequest = async () => {
        if (!fromPlayerId || !amount) return;
        setLoading(true);
        try {
            await createPaymentRequest(roomId, currentPlayerId, Number(amount), description || 'Payment Request', fromPlayerId);
            onClose();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <Stack gap="md">
            <div>
                <Text size="sm" fw={500} mb="xs">Request from</Text>
                <PlayerSelector
                    players={players}
                    currentPlayerId={currentPlayerId}
                    selectedPlayerId={fromPlayerId}
                    onSelect={setFromPlayerId}
                    includeBank={false}
                />
            </div>
            <NumberInput
                label="Amount"
                placeholder="0"
                value={amount === null ? '' : amount}
                onChange={setAmount}
                min={0}
                required
            />
            <Textarea
                label="Description (optional)"
                placeholder="e.g. Rent for Boardwalk"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <Button onClick={handleRequest} loading={loading} disabled={!fromPlayerId || !amount}>
                Request ${amount || 0}
            </Button>
        </Stack>
    );
}
