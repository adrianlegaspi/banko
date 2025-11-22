'use client'

import { Paper, Title, Stack, Group, Button, NumberInput, Select, Modal, Text } from '@mantine/core';
import { IconCoin, IconArrowRight, IconArrowLeft, IconBuildingBank, IconFlag } from '@tabler/icons-react';
import { useState } from 'react';
import type { Player, Room } from '@/app/actions';
import { createTransaction, finishGame, updatePlayerStatus } from '@/app/actions';

type Props = {
    room: Room;
    players: Player[];
};

export default function BankPanel({ room, players }: Props) {
    const [bankModal, setBankModal] = useState(false);
    const [potModal, setPotModal] = useState(false);
    const [salaryModal, setSalaryModal] = useState(false);
    const [endGameModal, setEndGameModal] = useState(false);

    return (
        <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-yellow-6)' }}>
            <Group justify="space-between" mb="md">
                <Title order={4}>🏦 {room.bank_display_name}</Title>
                <Text size="sm" fw={600}>Pot: ${room.shared_pot_balance || 0}</Text>
            </Group>

            <Stack gap="xs">
                <Group grow>
                    <Button size="xs" leftSection={<IconCoin size={16} />} onClick={() => setSalaryModal(true)}>
                        Pay Salary (${room.salary_amount})
                    </Button>
                    <Button size="xs" variant="light" leftSection={<IconBuildingBank size={16} />} onClick={() => setBankModal(true)}>
                        Bank Ops
                    </Button>
                </Group>

                <Button size="xs" variant="outline" onClick={() => setPotModal(true)}>
                    Pot Operations
                </Button>

                <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    leftSection={<IconFlag size={16} />}
                    onClick={() => setEndGameModal(true)}
                    mt="sm"
                >
                    End Game
                </Button>
            </Stack>

            <BankModal opened={bankModal} onClose={() => setBankModal(false)} room={room} players={players} />
            <PotModal opened={potModal} onClose={() => setPotModal(false)} room={room} players={players} />
            <SalaryModal opened={salaryModal} onClose={() => setSalaryModal(false)} room={room} players={players} />

            <Modal opened={endGameModal} onClose={() => setEndGameModal(false)} title="End Game Confirmation">
                <Stack>
                    <Text>Are you sure you want to end the game? This action cannot be undone.</Text>
                    <Group grow>
                        <Button variant="default" onClick={() => setEndGameModal(false)}>Cancel</Button>
                        <Button color="red" onClick={() => finishGame(room.room_code)}>End Game</Button>
                    </Group>
                </Stack>
            </Modal>
        </Paper>
    );
}

function SalaryModal({ opened, onClose, room, players }: { opened: boolean; onClose: () => void; room: Room; players: Player[] }) {
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!playerId) return;
        setLoading(true);
        try {
            await createTransaction(room.id, 'bank_to_player', room.salary_amount, 'Salary', undefined, playerId);
            onClose();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <Modal opened={opened} onClose={onClose} title={`Pay Salary ($${room.salary_amount})`}>
            <Stack gap="md">
                <Select
                    label="Select Player to Pay"
                    placeholder="Choose player"
                    data={players.map(p => ({ value: p.id, label: p.nickname }))}
                    value={playerId}
                    onChange={(val) => setPlayerId(val || '')}
                    required
                />

                <Button onClick={handleSubmit} loading={loading} disabled={!playerId}>
                    Pay ${room.salary_amount} to Player
                </Button>
            </Stack>
        </Modal>
    );
}

function BankModal({ opened, onClose, room, players }: { opened: boolean; onClose: () => void; room: Room; players: Player[] }) {
    const [mode, setMode] = useState<'to' | 'from' | 'status'>('to');
    const [amount, setAmount] = useState<number | string>(0);
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!playerId || !amount) return;
        setLoading(true);
        try {
            if (mode === 'to') {
                await createTransaction(room.id, 'bank_to_player', Number(amount), 'Bank Transfer', undefined, playerId);
            } else {
                await createTransaction(room.id, 'player_to_bank', Number(amount), 'Bank Collection', playerId, undefined);
            }
            onClose();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleStatusToggle = async () => {
        if (!playerId) return;
        setLoading(true);
        try {
            const player = players.find(p => p.id === playerId);
            const newStatus = player?.status === 'defeated' ? 'active' : 'defeated';
            await updatePlayerStatus(playerId, newStatus, room.room_code);
            onClose();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const selectedPlayer = players.find(p => p.id === playerId);

    return (
        <Modal opened={opened} onClose={onClose} title="Bank Operations">
            <Stack gap="md">
                <Group grow>
                    <Button variant={mode === 'to' ? 'filled' : 'light'} onClick={() => setMode('to')} leftSection={<IconArrowRight size={16} />}>
                        Give Money
                    </Button>
                    <Button variant={mode === 'from' ? 'filled' : 'light'} onClick={() => setMode('from')} leftSection={<IconArrowLeft size={16} />}>
                        Collect Money
                    </Button>
                    <Button variant={mode === 'status' ? 'filled' : 'light'} onClick={() => setMode('status')} leftSection={<IconFlag size={16} />}>
                        Status
                    </Button>
                </Group>

                <Select
                    label="Player"
                    data={players.map(p => ({
                        value: p.id,
                        label: `${p.nickname}${p.status === 'defeated' ? ' (Defeated)' : ''}`
                    }))}
                    value={playerId}
                    onChange={(val) => setPlayerId(val || '')}
                    required
                />

                {mode !== 'status' && (
                    <>
                        <NumberInput
                            label="Amount"
                            value={amount}
                            onChange={setAmount}
                            min={0}
                            required
                        />

                        <Button onClick={handleSubmit} loading={loading}>
                            {mode === 'to' ? 'Give' : 'Collect'} ${amount}
                        </Button>
                    </>
                )}

                {mode === 'status' && selectedPlayer && (
                    <Button
                        onClick={handleStatusToggle}
                        loading={loading}
                        color={selectedPlayer.status === 'defeated' ? 'green' : 'red'}
                    >
                        {selectedPlayer.status === 'defeated' ? 'Restore Player' : 'Mark as Defeated'}
                    </Button>
                )}
            </Stack>
        </Modal>
    );
}

function PotModal({ opened, onClose, room, players }: { opened: boolean; onClose: () => void; room: Room; players: Player[] }) {
    const [mode, setMode] = useState<'in' | 'out'>('in');
    const [amount, setAmount] = useState<number | string>(0);
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!playerId || !amount) return;
        setLoading(true);
        try {
            if (mode === 'in') {
                await createTransaction(room.id, 'pot_in', Number(amount), 'Added to Pot', playerId, undefined);
            } else {
                await createTransaction(room.id, 'pot_out', Number(amount), 'Collected from Pot', undefined, playerId);
            }
            onClose();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Pot Operations">
            <Stack gap="md">
                <Text size="sm" c="dimmed">Current Pot: ${room.shared_pot_balance || 0}</Text>

                <Group grow>
                    <Button variant={mode === 'in' ? 'filled' : 'light'} onClick={() => setMode('in')}>
                        Player → Pot
                    </Button>
                    <Button variant={mode === 'out' ? 'filled' : 'light'} onClick={() => setMode('out')}>
                        Pot → Player
                    </Button>
                </Group>

                <Select
                    label="Player"
                    data={players.map(p => ({ value: p.id, label: p.nickname }))}
                    value={playerId}
                    onChange={(val) => setPlayerId(val || '')}
                    required
                />

                <NumberInput
                    label="Amount"
                    value={amount}
                    onChange={setAmount}
                    min={0}
                    required
                />

                <Button onClick={handleSubmit} loading={loading}>
                    Move ${amount}
                </Button>
            </Stack>
        </Modal>
    );
}
