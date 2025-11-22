'use client'

import { Stack, Text, NumberInput, Textarea, Button } from '@mantine/core';
import { IconCoin } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { createTransaction } from '@/app/actions';
import PlayerSelector from '@/components/PlayerSelector';
import type { Player, Room } from '@/app/actions';

interface SendMoneyFormProps {
    roomId: string;
    players: Player[];
    currentPlayerId: string;
    room: Room;
    onClose: () => void;
    modalOpen: boolean;
    initialRecipientId: string | null;
    onToast?: (toast: { title: string; message: string; color: string }) => void;
}

export default function SendMoneyForm({
    roomId,
    players,
    currentPlayerId,
    room,
    onClose,
    modalOpen,
    initialRecipientId,
    onToast
}: SendMoneyFormProps) {
    const [amount, setAmount] = useState<number | string | null>(null);
    const [toPlayerId, setToPlayerId] = useState<string | null>(initialRecipientId || null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (modalOpen) {
            setToPlayerId(initialRecipientId || null);
        } else {
            setAmount(null);
            setToPlayerId(null);
            setDescription('');
        }
    }, [modalOpen, initialRecipientId]);

    const handleSend = async () => {
        if (!amount) return;
        setLoading(true);
        setFormError(null);
        try {
            const targetType = toPlayerId === null ? 'player_to_bank' : 'player_to_player';
            await createTransaction(roomId, targetType, Number(amount), description || 'Payment', currentPlayerId, toPlayerId || undefined);
            onClose();
            onToast?.({
                title: 'Payment sent',
                message: `You sent $${Number(amount)}`,
                color: 'green'
            });
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
            setFormError(message);
            onToast?.({
                title: 'Payment failed',
                message,
                color: 'red'
            });
        }
        setLoading(false);
    };

    return (
        <Stack gap="md">
            <div>
                <Text size="sm" fw={500} mb="xs">Send to</Text>
                <PlayerSelector
                    players={players}
                    currentPlayerId={currentPlayerId}
                    selectedPlayerId={toPlayerId}
                    onSelect={setToPlayerId}
                    includeBank={true}
                    room={room}
                />
            </div>
            <NumberInput
                label="Amount"
                placeholder="0"
                value={amount === null ? '' : amount}
                onChange={setAmount}
                min={0}
                leftSection={<IconCoin size={16} />}
                required
            />
            {formError && (
                <Text size="sm" c="red">
                    {formError}
                </Text>
            )}
            <Textarea
                label="Description"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <Button onClick={handleSend} loading={loading} disabled={!amount}>
                Send ${amount || 0}
            </Button>
        </Stack>
    );
}
