'use client'

import { Container, Title, Text, Group, Stack, Paper, Badge, Avatar, Button, Modal, NumberInput, Select, Textarea } from '@mantine/core';
import { IconSend, IconReceipt2, IconQrcode } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Room, Player } from '@/app/actions';
import { createTransaction, createPaymentRequest, respondToPaymentRequest } from '@/app/actions';
import BankPanel from '@/components/BankPanel';

type Transaction = any;

type Props = {
    room: Room;
    currentPlayer: Player;
    players: Player[];
    transactions: Transaction[];
};

export default function GameClient({ room, currentPlayer, players: initialPlayers, transactions: initialTransactions }: Props) {
    const [players, setPlayers] = useState(initialPlayers);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [paymentRequests, setPaymentRequests] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        // Initial fetch of pending requests
        supabase.from('payment_requests')
            .select('*, from_player:players!from_player_id(nickname)')
            .eq('room_id', room.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (data) setPaymentRequests(data);
            });

        const channel = supabase
            .channel('game')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, () => {
                supabase.from('players').select('*').eq('room_id', room.id).then(({ data }) => {
                    if (data) setPlayers(data);
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `room_id=eq.${room.id}` }, () => {
                supabase.from('transactions').select('*, from_player:players!from_player_id(nickname), to_player:players!to_player_id(nickname)').eq('room_id', room.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => {
                    if (data) setTransactions(data);
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests', filter: `room_id=eq.${room.id}` }, () => {
                supabase.from('payment_requests')
                    .select('*, from_player:players!from_player_id(nickname)')
                    .eq('room_id', room.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .then(({ data }) => {
                        if (data) setPaymentRequests(data);
                    });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (payload: any) => {
                if (payload.new.status === 'finished') {
                    window.location.href = `/room/${room.room_code}/finish`;
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room.id, room.room_code, supabase]);

    const myBalance = players.find(p => p.id === currentPlayer.id)?.current_balance || 0;

    // Filter requests where I am the target (to_player_id is me OR null/QR) AND I am not the requester
    const myPendingRequests = paymentRequests.filter(pr =>
        (pr.to_player_id === currentPlayer.id || pr.to_player_id === null) &&
        pr.from_player_id !== currentPlayer.id
    );

    return (
        <Container size="md" py="md">
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between">
                    <div>
                        <Title order={3}>{room.room_name}</Title>
                        <Text size="sm" c="dimmed">{room.room_code}</Text>
                    </div>
                    <Badge size="lg" color="green">In Progress</Badge>
                </Group>

                {/* Balance Card */}
                <Paper p="xl" radius="md" withBorder style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-9) 0%, var(--mantine-color-grape-9) 100%)' }}>
                    <Stack align="center" gap="xs">
                        <Text size="sm" c="white" opacity={0.8}>Your Balance</Text>
                        <Title order={1} c="white" style={{ fontSize: '3rem' }}>${myBalance.toLocaleString()}</Title>
                        <Avatar color={currentPlayer.color} size="lg" radius="xl">{currentPlayer.nickname[0]}</Avatar>
                        <Text c="white">{currentPlayer.nickname}</Text>
                    </Stack>
                </Paper>

                {/* Pending Requests Alert */}
                {myPendingRequests.length > 0 && (
                    <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-orange-6)', backgroundColor: 'rgba(255, 145, 0, 0.1)' }}>
                        <Text fw={600} mb="sm" c="orange">Pending Requests ({myPendingRequests.length})</Text>
                        <Stack gap="sm">
                            {myPendingRequests.map(pr => (
                                <Group key={pr.id} justify="space-between" p="xs" style={{ background: 'var(--mantine-color-dark-6)', borderRadius: 'var(--mantine-radius-sm)' }}>
                                    <div>
                                        <Text size="sm" fw={500}>{pr.from_player.nickname} requests <span style={{ fontWeight: 700 }}>${pr.amount}</span></Text>
                                        <Text size="xs" c="dimmed">{pr.description}</Text>
                                    </div>
                                    <Group gap="xs">
                                        <Button size="xs" color="red" variant="subtle" onClick={async () => {
                                            await respondToPaymentRequest(pr.id, 'rejected', currentPlayer.id, room.room_code);
                                        }}>Reject</Button>
                                        <Button size="xs" color="green" onClick={async () => {
                                            await respondToPaymentRequest(pr.id, 'accepted', currentPlayer.id, room.room_code);
                                        }}>Pay</Button>
                                    </Group>
                                </Group>
                            ))}
                        </Stack>
                    </Paper>
                )}

                {/* Action Buttons */}
                <Group grow>
                    <Button leftSection={<IconSend size={18} />} onClick={() => setSendModalOpen(true)}>
                        Send Money
                    </Button>
                    <Button leftSection={<IconReceipt2 size={18} />} variant="light" onClick={() => setRequestModalOpen(true)}>
                        Request
                    </Button>
                    <Button leftSection={<IconQrcode size={18} />} variant="outline" onClick={() => setQrModalOpen(true)}>
                        QR Request
                    </Button>
                </Group>

                {/* Bank Panel (Operator Only) */}
                {currentPlayer.is_bank_operator && (
                    <BankPanel room={room} players={players} />
                )}

                {/* Players List */}
                <Paper p="md" radius="md" withBorder>
                    <Text fw={600} mb="sm">All Players</Text>
                    <Stack gap="xs">
                        {players.map((p) => (
                            <Group key={p.id} justify="space-between" p="xs" style={{ borderRadius: 'var(--mantine-radius-sm)', background: p.id === currentPlayer.id ? 'var(--mantine-color-dark-6)' : 'transparent' }}>
                                <Group gap="sm">
                                    <Avatar color={p.color} radius="xl" size="sm">{p.nickname[0]}</Avatar>
                                    <Text size="sm">{p.nickname}</Text>
                                    {p.is_bank_operator && <Badge size="xs" color="yellow">Banker</Badge>}
                                </Group>
                                <Text fw={600} size="sm">${p.current_balance.toLocaleString()}</Text>
                            </Group>
                        ))}
                    </Stack>
                </Paper>

                {/* Recent Transactions */}
                <Paper p="md" radius="md" withBorder>
                    <Text fw={600} mb="sm">Recent Activity</Text>
                    <Stack gap="xs">
                        {transactions.slice(0, 10).map((t: any) => (
                            <Group key={t.id} justify="space-between" p="xs" style={{ fontSize: '0.85rem' }}>
                                <Text size="xs" c="dimmed">
                                    {t.from_player?.nickname || 'Bank'} → {t.to_player?.nickname || 'Bank'}
                                </Text>
                                <Text size="xs" fw={600}>${t.amount}</Text>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            </Stack>

            {/* Send Money Modal */}
            <Modal opened={sendModalOpen} onClose={() => setSendModalOpen(false)} title="Send Money">
                <SendMoneyForm
                    roomId={room.id}
                    players={players}
                    currentPlayerId={currentPlayer.id}
                    onClose={() => setSendModalOpen(false)}
                />
            </Modal>

            {/* Request Modal */}
            <Modal opened={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Payment">
                <RequestMoneyForm
                    roomId={room.id}
                    players={players}
                    currentPlayerId={currentPlayer.id}
                    onClose={() => setRequestModalOpen(false)}
                />
            </Modal>

            {/* QR Modal - TBD */}
            <Modal opened={qrModalOpen} onClose={() => setQrModalOpen(false)} title="QR Payment Request">
                <Text c="dimmed">Coming soon...</Text>
            </Modal>
        </Container>
    );
}

function SendMoneyForm({ roomId, players, currentPlayerId, onClose }: any) {
    const [amount, setAmount] = useState<number | string>(0);
    const [toPlayerId, setToPlayerId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!toPlayerId || !amount) return;
        setLoading(true);
        try {
            await createTransaction(roomId, 'player_to_player', Number(amount), description || 'Payment', currentPlayerId, toPlayerId);
            onClose();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <Stack gap="md">
            <Select
                label="To Player"
                placeholder="Select a player"
                data={players.filter((p: Player) => p.id !== currentPlayerId).map((p: Player) => ({ value: p.id, label: p.nickname }))}
                value={toPlayerId}
                onChange={(val) => setToPlayerId(val || '')}
                required
            />
            <NumberInput
                label="Amount"
                placeholder="0"
                value={amount}
                onChange={setAmount}
                min={0}
                required
            />
            <Textarea
                label="Description (optional)"
                placeholder="e.g. Rent payment"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <Button onClick={handleSend} loading={loading} disabled={!toPlayerId || !amount}>
                Send ${amount}
            </Button>
        </Stack>
    );
}

function RequestMoneyForm({ roomId, players, currentPlayerId, onClose }: any) {
    const [amount, setAmount] = useState<number | string>(0);
    const [fromPlayerId, setFromPlayerId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

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
            <Select
                label="Request From"
                placeholder="Select a player"
                data={players.filter((p: Player) => p.id !== currentPlayerId).map((p: Player) => ({ value: p.id, label: p.nickname }))}
                value={fromPlayerId}
                onChange={(val) => setFromPlayerId(val || '')}
                required
            />
            <NumberInput
                label="Amount"
                placeholder="0"
                value={amount}
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
                Request ${amount}
            </Button>
        </Stack>
    );
}
