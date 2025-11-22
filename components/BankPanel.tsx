'use client'

import { Paper, Title, Stack, Group, Button, NumberInput, Modal, Text, Badge, SimpleGrid, SegmentedControl } from '@mantine/core';
import { IconCoin, IconArrowRight, IconArrowLeft, IconBuildingBank, IconFlag, IconUsers, IconTrophy } from '@tabler/icons-react';
import { useState } from 'react';
import type { Player, Room } from '@/app/actions';
import { createTransaction, finishGame, updatePlayerStatus } from '@/app/actions';
import PlayerSelector from './PlayerSelector';

type Props = {
    room: Room;
    players: Player[];
};

export default function BankPanel({ room, players }: Props) {
    const [bankModal, setBankModal] = useState(false);
    const [potModal, setPotModal] = useState(false);
    const [salaryModal, setSalaryModal] = useState(false);
    const [playerModal, setPlayerModal] = useState(false);
    const [endGameModal, setEndGameModal] = useState(false);

    return (
        <Paper p="xl" radius="lg" withBorder style={{
            borderColor: 'var(--mantine-color-dark-4)',
            background: 'linear-gradient(135deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)'
        }}>
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                        <IconBuildingBank size={28} style={{ color: 'var(--mantine-color-blue-3)' }} />
                        <Title order={3} style={{ color: 'var(--mantine-color-blue-3)' }}>
                            {room.bank_display_name}
                        </Title>
                    </Group>
                    <Paper p="md" radius="md" style={{
                        background: 'linear-gradient(135deg, var(--mantine-color-grape-9) 0%, var(--mantine-color-grape-7) 100%)',
                        minWidth: '140px'
                    }}>
                        <Stack gap={0} align="center">
                            <Text size="xs" c="white" opacity={0.7}>Shared Pot</Text>
                            <Text size="xl" fw={700} c="white">${room.shared_pot_balance || 0}</Text>
                        </Stack>
                    </Paper>
                </Group>

                {/* Main Actions Grid */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* Pay Salary */}
                    <Paper
                        p="lg"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, var(--mantine-color-blue-9) 0%, var(--mantine-color-blue-7) 100%)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onClick={() => setSalaryModal(true)}
                    >
                        <Stack align="center" gap="xs">
                            <IconCoin size={32} style={{ color: 'white' }} />
                            <Text size="sm" fw={600} c="white" ta="center">Pay Salary</Text>
                            <Text size="xs" c="white" opacity={0.7}>${room.salary_amount}</Text>
                        </Stack>
                    </Paper>

                    {/* Bank Transfers */}
                    <Paper
                        p="lg"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, var(--mantine-color-cyan-9) 0%, var(--mantine-color-cyan-7) 100%)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onClick={() => setBankModal(true)}
                    >
                        <Stack align="center" gap="xs">
                            <IconArrowRight size={32} style={{ color: 'white' }} />
                            <Text size="sm" fw={600} c="white" ta="center">Bank Transfers</Text>
                            <Text size="xs" c="white" opacity={0.7}>Give / Collect</Text>
                        </Stack>
                    </Paper>

                    {/* Pot Operations */}
                    <Paper
                        p="lg"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, var(--mantine-color-grape-9) 0%, var(--mantine-color-grape-7) 100%)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onClick={() => setPotModal(true)}
                    >
                        <Stack align="center" gap="xs">
                            <IconTrophy size={32} style={{ color: 'white' }} />
                            <Text size="sm" fw={600} c="white" ta="center">Pot Operations</Text>
                            <Text size="xs" c="white" opacity={0.7}>Manage Pot</Text>
                        </Stack>
                    </Paper>

                    {/* Player Status */}
                    <Paper
                        p="lg"
                        radius="md"
                        style={{
                            background: 'linear-gradient(135deg, var(--mantine-color-orange-9) 0%, var(--mantine-color-orange-7) 100%)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onClick={() => setPlayerModal(true)}
                    >
                        <Stack align="center" gap="xs">
                            <IconUsers size={32} style={{ color: 'white' }} />
                            <Text size="sm" fw={600} c="white" ta="center">Player Status</Text>
                            <Text size="xs" c="white" opacity={0.7}>Active / Defeated</Text>
                        </Stack>
                    </Paper>
                </SimpleGrid>

                {/* End Game - Danger Zone */}
                <Paper p="sm" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-8)', backgroundColor: 'var(--mantine-color-red-9)' }}>
                    <Button
                        fullWidth
                        size="sm"
                        color="red"
                        variant="subtle"
                        leftSection={<IconFlag size={16} />}
                        onClick={() => setEndGameModal(true)}
                    >
                        End Game
                    </Button>
                </Paper>
            </Stack>

            <BankModal opened={bankModal} onClose={() => setBankModal(false)} room={room} players={players} />
            <PotModal opened={potModal} onClose={() => setPotModal(false)} room={room} players={players} />
            <SalaryModal opened={salaryModal} onClose={() => setSalaryModal(false)} room={room} players={players} />
            <PlayerStatusModal opened={playerModal} onClose={() => setPlayerModal(false)} room={room} players={players} />

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
                <Text size="sm" c="dimmed" mb="xs">Select a player to send the salary to:</Text>
                <PlayerSelector
                    players={players}
                    currentPlayerId="bank"
                    room={room}
                    selectedPlayerId={playerId}
                    onSelect={setPlayerId}
                />

                <Button
                    size="lg"
                    fullWidth
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!playerId}
                    color="blue"
                >
                    Pay ${room.salary_amount} to Player
                </Button>
            </Stack>
        </Modal>
    );
}

function BankModal({ opened, onClose, room, players }: { opened: boolean; onClose: () => void; room: Room; players: Player[] }) {
    const [mode, setMode] = useState<'to' | 'from'>('to');
    const [amount, setAmount] = useState<number | string | null>(null);
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

    return (
        <Modal opened={opened} onClose={onClose} title="Bank Transfers">
            <Stack gap="md">
                <SegmentedControl
                    value={mode}
                    onChange={(value) => setMode(value as 'to' | 'from')}
                    data={[
                        { label: 'Give Money', value: 'to' },
                        { label: 'Collect Money', value: 'from' },
                    ]}
                    fullWidth
                    size="md"
                    color={mode === 'to' ? 'green' : 'orange'}
                />

                <Paper p="md" withBorder style={{ borderColor: mode === 'to' ? 'var(--mantine-color-green-8)' : 'var(--mantine-color-orange-8)', background: 'transparent' }}>
                    <Stack gap="md">
                        <Text size="sm" fw={500}>
                            {mode === 'to' ? 'Select Player to RECEIVE money:' : 'Select Player to TAKE money from:'}
                        </Text>
                        <PlayerSelector
                            players={players}
                            currentPlayerId="bank"
                            room={room}
                            selectedPlayerId={playerId}
                            onSelect={setPlayerId}
                        />

                        <NumberInput
                            label="Amount"
                            placeholder="0"
                            value={amount === null ? '' : amount}
                            onChange={setAmount}
                            min={0}
                            size="md"
                            leftSection={<IconCoin size={16} />}
                            required
                        />
                    </Stack>
                </Paper>

                <Button
                    size="lg"
                    fullWidth
                    onClick={handleSubmit}
                    loading={loading}
                    color={mode === 'to' ? 'green' : 'orange'}
                    disabled={!playerId || !amount}
                >
                    {mode === 'to' ? 'Give' : 'Collect'} ${amount || 0}
                </Button>
            </Stack>
        </Modal>
    );
}

function PotModal({ opened, onClose, room, players }: { opened: boolean; onClose: () => void; room: Room; players: Player[] }) {
    const [mode, setMode] = useState<'in' | 'out'>('in');
    const [amount, setAmount] = useState<number | string | null>(null);
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
                <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-dark-6)' }}>
                    <Text size="sm" c="dimmed" ta="center">Current Pot: <span style={{ fontWeight: 700, color: 'white' }}>${room.shared_pot_balance || 0}</span></Text>
                </Paper>

                <Group grow mb="xs">
                    <Button
                        size="md"
                        color="grape"
                        variant={mode === 'in' ? 'filled' : 'light'}
                        onClick={() => setMode('in')}
                    >
                        Player → Pot
                    </Button>
                    <Button
                        size="md"
                        color="cyan"
                        variant={mode === 'out' ? 'filled' : 'light'}
                        onClick={() => setMode('out')}
                    >
                        Pot → Player
                    </Button>
                </Group>

                <Paper p="md" withBorder style={{ borderColor: mode === 'in' ? 'var(--mantine-color-grape-8)' : 'var(--mantine-color-cyan-8)', background: 'transparent' }}>
                    <Stack gap="md">
                        <Text size="sm" fw={500}>
                            {mode === 'in' ? 'Select Player putting money IN:' : 'Select Player taking money OUT:'}
                        </Text>
                        <PlayerSelector
                            players={players}
                            currentPlayerId="bank"
                            room={room}
                            selectedPlayerId={playerId}
                            onSelect={setPlayerId}
                        />

                        <NumberInput
                            label="Amount"
                            placeholder="0"
                            value={amount === null ? '' : amount}
                            onChange={setAmount}
                            min={0}
                            size="md"
                            leftSection={<IconCoin size={16} />}
                            required
                            rightSectionWidth={80}
                            rightSection={
                                mode === 'in' && (
                                    <Button
                                        size="xs"
                                        variant="subtle"
                                        onClick={() => setAmount(players.find(p => p.id === playerId)?.current_balance || 0)}
                                        disabled={!playerId}
                                    >
                                        Max
                                    </Button>
                                ) || mode === 'out' && (
                                    <Button
                                        size="xs"
                                        variant="subtle"
                                        onClick={() => setAmount(room.shared_pot_balance || 0)}
                                    >
                                        Pay All
                                    </Button>
                                )
                            }
                        />
                    </Stack>
                </Paper>

                <Button
                    size="lg"
                    fullWidth
                    onClick={handleSubmit}
                    loading={loading}
                    color={mode === 'in' ? 'grape' : 'cyan'}
                    disabled={!playerId || !amount}
                >
                    Move ${amount || 0}
                </Button>
            </Stack>
        </Modal>
    );
}

function PlayerStatusModal({ opened, onClose, room, players }: { opened: boolean; onClose: () => void; room: Room; players: Player[] }) {
    const [playerId, setPlayerId] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedPlayer = players.find(p => p.id === playerId);

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

    return (
        <Modal opened={opened} onClose={onClose} title="Player Status Management">
            <Stack gap="md">
                <Text size="sm" c="dimmed">Select a player to change their status:</Text>
                <PlayerSelector
                    players={players}
                    currentPlayerId="bank"
                    room={room}
                    selectedPlayerId={playerId}
                    onSelect={setPlayerId}
                    showDefeated={true}
                />

                {selectedPlayer && (
                    <Paper p="md" radius="md" withBorder style={{ borderColor: selectedPlayer.status === 'defeated' ? 'var(--mantine-color-red-8)' : 'var(--mantine-color-green-8)' }}>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text size="sm">Current Status:</Text>
                                <Badge size="lg" color={selectedPlayer.status === 'defeated' ? 'red' : 'green'} variant="filled">
                                    {selectedPlayer.status === 'defeated' ? 'Defeated' : 'Active'}
                                </Badge>
                            </Group>

                            <Button
                                size="lg"
                                fullWidth
                                onClick={handleStatusToggle}
                                loading={loading}
                                color={selectedPlayer.status === 'defeated' ? 'green' : 'red'}
                            >
                                {selectedPlayer.status === 'defeated' ? 'Restore Player' : 'Mark as Defeated'}
                            </Button>
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </Modal>
    );
}
