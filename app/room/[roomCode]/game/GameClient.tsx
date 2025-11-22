'use client'

import { Container, Title, Text, Group, Stack, Paper, Badge, Avatar, Button, Modal, NumberInput, Textarea, Affix, Notification, Transition, SimpleGrid, Grid, Menu, ActionIcon, Tabs, ScrollArea, TextInput, SegmentedControl } from '@mantine/core';
import { IconSend, IconReceipt2, IconQrcode, IconSquare, IconRefresh, IconTrophy, IconDotsVertical, IconDownload, IconBuildingBank, IconBuildingEstate, IconCoin, IconHome, IconBuildingSkyscraper } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Room, Player } from '@/app/actions';
import { createTransaction, createPaymentRequest, respondToPaymentRequest, rollDice, getLoans, repayLoan } from '@/app/actions';
import BankPanel from '@/components/BankPanel';
import PlayerSelector from '@/components/PlayerSelector';

type Transaction = any;
type ToastMessage = { title: string; message: string; color: string };

type Props = {
    room: Room;
    currentPlayer: Player;
    players: Player[];
    transactions: Transaction[];
    gameEvents: any[];
};

export default function GameClient({ room, currentPlayer, players: initialPlayers, transactions: initialTransactions, gameEvents: initialGameEvents }: Props) {
    const [players, setPlayers] = useState(initialPlayers);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [gameEvents, setGameEvents] = useState(initialGameEvents);
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [bankServicesModalOpen, setBankServicesModalOpen] = useState(false);
    const [defaultRecipientId, setDefaultRecipientId] = useState<string | null>(null);
    const [defaultRequestPayerId, setDefaultRequestPayerId] = useState<string | null>(null);
    const [rolling, setRolling] = useState(false);
    const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
    const [activityPage, setActivityPage] = useState(0);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const playersRef = useRef(players);
    const audioContextRef = useRef<AudioContext | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    const router = useRouter();

    const showToast = useCallback((toastData: ToastMessage) => {
        setToast(toastData);
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    // Memoize supabase client to prevent re-creation on every render
    const supabase = useMemo(() => createClient(), []);

    // Initialize audio context on first user interaction
    const initAudioContext = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                audioContextRef.current = new AudioContext();
            }
        }
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const playNotificationSound = () => {
        try {
            initAudioContext();
            if (!audioContextRef.current) return;

            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `room_id=eq.${room.id}` }, (payload: any) => {
                const newTransaction = payload.new;

                // Check if current player received money
                if (newTransaction.to_player_id === currentPlayer.id) {
                    // Play success sound
                    const audio = new Audio('/assets/sounds/success.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.error('Audio play failed', e));

                    // Fetch transaction details to get sender info
                    supabase
                        .from('transactions')
                        .select('*, from_player:players!from_player_id(nickname)')
                        .eq('id', newTransaction.id)
                        .single()
                        .then(({ data }) => {
                            if (data) {
                                const fromName = data.from_player?.nickname || 'Bank';
                                showToast({
                                    title: 'Money Received! 💰',
                                    message: `${fromName} sent you $${data.amount}`,
                                    color: 'green'
                                });
                            }
                        });
                }

                // Update transactions list
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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `room_id=eq.${room.id}` }, (payload: any) => {
                console.log('Game Event Received:', payload);
                // Show Toast
                const newEvent = payload.new;
                if (newEvent.event_type === 'dice_roll') {
                    const player = playersRef.current.find(p => p.id === newEvent.player_id);
                    const nickname = player ? player.nickname : 'Unknown Player';
                    const roll = newEvent.payload.roll;
                    const sides = newEvent.payload.sides;

                    showToast({
                        title: 'Dice Roll!',
                        message: `${nickname} rolled a ${roll} (d${sides})`,
                        color: 'orange'
                    });

                    playNotificationSound();
                }

                supabase.from('game_events').select('*, player:players(nickname)').eq('room_id', room.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => {
                    if (data) setGameEvents(data);
                });
            })
            .subscribe((status) => {
                console.log('Realtime Subscription Status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room.id, room.room_code, supabase, currentPlayer.id, showToast]);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    const myBalance = players.find(p => p.id === currentPlayer.id)?.current_balance || 0;
    const isDefeated = currentPlayer.status === 'defeated';

    // Filter requests where I am the target (to_player_id is me OR null/QR) AND I am not the requester
    const myPendingRequests = paymentRequests.filter(pr =>
        (pr.to_player_id === currentPlayer.id || pr.to_player_id === null) &&
        pr.from_player_id !== currentPlayer.id
    );

    return (
        <Container size="xl" py="md">
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between">
                    <div>
                        <Title order={3}>{room.room_name}</Title>
                        <Text size="sm" c="dimmed">{room.room_code}</Text>
                    </div>
                    <Badge size="lg" color="green">In Progress</Badge>
                </Group>

                <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
                        <Stack gap="md">
                            {/* Shared Pot Display */}
                            <Paper
                                p="md"
                                radius="md"
                                withBorder
                                style={{
                                    background: 'linear-gradient(135deg, var(--mantine-color-yellow-9) 0%, var(--mantine-color-orange-9) 100%)',
                                    borderColor: 'var(--mantine-color-yellow-6)'
                                }}
                            >
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconTrophy size={24} color="white" />
                                        <Text fw={700} c="white">Shared Pot</Text>
                                    </Group>
                                    <Text fw={800} size="xl" c="white">${room.shared_pot_balance || 0}</Text>
                                </Group>
                            </Paper>

                            {/* Balance Card */}
                            <Paper
                                p="xl"
                                radius="lg"
                                withBorder
                                style={{
                                    background: `linear-gradient(135deg, var(--mantine-color-${currentPlayer.color}-9) 0%, var(--mantine-color-${currentPlayer.color}-7) 100%)`,
                                    color: 'white',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: '220px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                }}
                            >
                                {/* Decorative Circles */}
                                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                                <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                                <Group justify="space-between" align="start">
                                    <div>
                                        <Text fw={700} size="lg" style={{ letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                                            {room.bank_display_name}
                                        </Text>
                                        <Text size="xs" c="white" opacity={0.6}>Debit Card</Text>
                                    </div>
                                    <IconQrcode size={32} style={{ opacity: 0.8 }} />
                                </Group>

                                <Stack gap={0} my="md">
                                    <Text size="sm" c="white" opacity={0.8} mb={-5}>Current Balance</Text>
                                    <Title order={1} c="white" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                                        ${myBalance.toLocaleString()}
                                    </Title>
                                </Stack>

                                <Group justify="space-between" align="end">
                                    <Group gap="xs">
                                        <Avatar color={currentPlayer.color} size="md" radius="xl">{currentPlayer.nickname[0]}</Avatar>
                                        <Stack gap={0}>
                                            <Text size="xs" opacity={0.6} lh={1}>Card Holder</Text>
                                            <Group gap="xs">
                                                <Text fw={600} size="lg">{currentPlayer.nickname}</Text>
                                                {isDefeated && (
                                                    <Badge size="sm" color="red" variant="filled">Defeated</Badge>
                                                )}
                                            </Group>
                                        </Stack>
                                    </Group>
                                    <Text size="xl" fw={700} style={{ opacity: 0.5, letterSpacing: '2px' }}>•••• {room.room_code}</Text>
                                </Group>
                            </Paper>

                            {/* Pending Requests Alert */}
                            {
                                myPendingRequests.length > 0 && (
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
                                )
                            }

                            {/* Action Buttons */}
                            {!isDefeated && (
                                <Stack gap="sm">
                                    <SimpleGrid cols={2} spacing="sm">
                                        <Paper
                                            p="md"
                                            radius="md"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-indigo-6) 100%)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onClick={() => { initAudioContext(); setSendModalOpen(true); }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Stack align="center" gap="xs">
                                                <IconSend size={32} color="white" />
                                                <Text fw={600} c="white">Send</Text>
                                            </Stack>
                                        </Paper>

                                        <Paper
                                            p="md"
                                            radius="md"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--mantine-color-grape-6) 0%, var(--mantine-color-pink-6) 100%)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onClick={() => { initAudioContext(); setRequestModalOpen(true); }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Stack align="center" gap="xs">
                                                <IconReceipt2 size={32} color="white" />
                                                <Text fw={600} c="white">Request</Text>
                                            </Stack>
                                        </Paper>

                                        <Paper
                                            p="md"
                                            radius="md"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--mantine-color-cyan-6) 0%, var(--mantine-color-teal-6) 100%)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onClick={() => { initAudioContext(); setQrModalOpen(true); }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Stack align="center" gap="xs">
                                                <IconQrcode size={32} color="white" />
                                                <Text fw={600} c="white">QR Code</Text>
                                            </Stack>
                                        </Paper>

                                        <Paper
                                            p="md"
                                            radius="md"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--mantine-color-violet-6) 0%, var(--mantine-color-grape-6) 100%)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onClick={() => { initAudioContext(); setScanModalOpen(true); }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Stack align="center" gap="xs">
                                                <IconQrcode size={32} color="white" />
                                                <Text fw={600} c="white">Scan</Text>
                                            </Stack>
                                        </Paper>

                                        <Paper
                                            p="md"
                                            radius="md"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--mantine-color-teal-6) 0%, var(--mantine-color-green-6) 100%)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onClick={() => { initAudioContext(); setBankServicesModalOpen(true); }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Stack align="center" gap="xs">
                                                <IconBuildingBank size={32} color="white" />
                                                <Text fw={600} c="white">Bank Services</Text>
                                            </Stack>
                                        </Paper>
                                        <Paper
                                            p="md"
                                            radius="md"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--mantine-color-violet-6) 0%, var(--mantine-color-indigo-6) 100%)',
                                                cursor: rolling ? 'wait' : 'pointer',
                                                transition: 'transform 0.2s ease',
                                                opacity: rolling ? 0.7 : 1,
                                                pointerEvents: rolling ? 'none' : 'auto'
                                            }}
                                            onClick={async () => {
                                                initAudioContext();
                                                setRolling(true);
                                                try {
                                                    await rollDice(room.id, currentPlayer.id, room.dice_sides || 12);
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                                setRolling(false);
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!rolling) e.currentTarget.style.transform = 'scale(1.02)';
                                            }}
                                            onMouseLeave={(e) => {

                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <Stack align="center" gap="xs">
                                                <Group gap="xs">
                                                    <IconSquare size={28} color="white" />
                                                    <Text fw={600} c="white">Roll Dice</Text>
                                                </Group>
                                                <Text size="sm" c="white" opacity={0.8}>d{room.dice_sides || 12}</Text>
                                            </Stack>
                                        </Paper>
                                    </SimpleGrid>
                                </Stack>
                            )}

                            {
                                isDefeated && (
                                    <Paper p="xl" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-6)', backgroundColor: 'var(--mantine-color-red-9)' }}>
                                        <Stack align="center" gap="sm">
                                            <Text size="xl">💀</Text>
                                            <Text size="lg" fw={700} c="red" ta="center">Player Defeated</Text>
                                            <Text size="sm" c="dimmed" ta="center">You can no longer perform actions, but you can still view the game.</Text>
                                        </Stack>
                                    </Paper>
                                )
                            }

                        </Stack>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
                        <Stack gap="md">
                            {/* Bank Panel (Operator Only) */}
                            {
                                currentPlayer.is_bank_operator && (
                                    <BankPanel room={room} players={players} />
                                )
                            }

                            {/* Players List */}
                            <Paper p="md" radius="md" shadow="sm" style={{ background: 'var(--mantine-color-dark-7)' }}>
                                <Group justify="space-between" mb="sm">
                                    <Text fw={600}>All Players</Text>
                                    <Badge variant="light" color="gray">{players.length}</Badge>
                                </Group>
                                <Stack gap="xs">
                                    {players.map((p) => (
                                        <Menu key={p.id} shadow="md" width={200} position="bottom-end">
                                            <Menu.Target>
                                                <Paper p="xs" radius="md" style={{ background: p.id === currentPlayer.id ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-6)', opacity: p.status === 'defeated' ? 0.6 : 1, cursor: 'pointer' }}>
                                                    <Group justify="space-between">
                                                        <Group gap="sm">
                                                            <Avatar color={p.color} radius="xl" size="sm">{p.nickname[0]}</Avatar>
                                                            <div>
                                                                <Group gap="xs">
                                                                    <Text size="sm" fw={500}>{p.nickname}</Text>
                                                                    {p.status === 'defeated' && (
                                                                        <Badge size="xs" color="red" variant="filled">Defeated</Badge>
                                                                    )}
                                                                </Group>
                                                            </div>
                                                        </Group>
                                                        <Group gap="xs">
                                                            <Text size="sm" fw={600}>${p.current_balance}</Text>
                                                            {p.id !== currentPlayer.id && !isDefeated && p.status !== 'defeated' && (
                                                                <IconDotsVertical size={16} style={{ opacity: 0.5 }} />
                                                            )}
                                                        </Group>
                                                    </Group>
                                                </Paper>
                                            </Menu.Target>

                                            {p.id !== currentPlayer.id && !isDefeated && p.status !== 'defeated' && (
                                                <Menu.Dropdown>
                                                    <Menu.Label>Actions for {p.nickname}</Menu.Label>
                                                    <Menu.Item leftSection={<IconSend size={14} />} onClick={() => {
                                                        setDefaultRecipientId(p.id);
                                                        setSendModalOpen(true);
                                                    }}>
                                                        Send Money
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => {
                                                        setDefaultRequestPayerId(p.id);
                                                        setRequestModalOpen(true);
                                                    }}>
                                                        Request Money
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            )}
                                        </Menu>
                                    ))}
                                </Stack>
                            </Paper>

                            {/* Recent Activity */}
                            <Paper p="md" radius="md" shadow="sm" style={{ background: 'var(--mantine-color-dark-7)' }}>
                                <Text fw={600} mb="sm">Recent Activity</Text>
                                {(() => {
                                    const allActivity = [
                                        ...transactions.map((t: any) => ({
                                            id: t.id,
                                            type: 'transaction',
                                            from: t.from_player?.nickname || 'Bank',
                                            to: t.to_player?.nickname || 'Bank',
                                            amount: t.amount,
                                            description: t.description,
                                            created_at: t.created_at
                                        })),
                                        ...paymentRequests
                                            .filter((pr: any) => pr.status !== 'pending')
                                            .map((pr: any) => ({
                                                id: pr.id,
                                                type: pr.status === 'accepted' ? 'request_accepted' : 'request_rejected',
                                                from: pr.from_player?.nickname || 'Unknown',
                                                to: pr.to_player_id ? players.find((p: Player) => p.id === pr.to_player_id)?.nickname || 'Unknown' : 'QR',
                                                amount: pr.amount,
                                                description: pr.description,
                                                created_at: pr.updated_at || pr.created_at
                                            })),
                                        ...gameEvents.map((ge: any) => ({
                                            id: ge.id,
                                            type: 'dice_roll',
                                            from: ge.player?.nickname || 'Unknown',
                                            description: `Rolled a ${ge.payload.roll} (d${ge.payload.sides})`,
                                            created_at: ge.created_at,
                                            payload: ge.payload
                                        }))
                                    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                                    const itemsPerPage = 8;
                                    const totalPages = Math.ceil(allActivity.length / itemsPerPage);
                                    const paginatedActivity = allActivity.slice(activityPage * itemsPerPage, (activityPage + 1) * itemsPerPage);

                                    return (
                                        <>
                                            <Stack gap="xs">
                                                {paginatedActivity.length === 0 ? (
                                                    <Text size="sm" c="dimmed" ta="center" py="md">No activity yet</Text>
                                                ) : (
                                                    paginatedActivity.map((activity: any) => {
                                                        const timestamp = new Date(activity.created_at);
                                                        const now = new Date();
                                                        const diffMs = now.getTime() - timestamp.getTime();
                                                        const diffMins = Math.floor(diffMs / 60000);
                                                        const diffHours = Math.floor(diffMins / 60);
                                                        const diffDays = Math.floor(diffHours / 24);

                                                        let timeAgo = '';
                                                        if (diffDays > 0) {
                                                            timeAgo = `${diffDays}d ago`;
                                                        } else if (diffHours > 0) {
                                                            timeAgo = `${diffHours}h ago`;
                                                        } else if (diffMins > 0) {
                                                            timeAgo = `${diffMins}m ago`;
                                                        } else {
                                                            timeAgo = 'Just now';
                                                        }

                                                        return (
                                                            <Group key={activity.id} justify="space-between" p="xs" style={{ fontSize: '0.85rem' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <Text size="xs" c="dimmed">
                                                                        {activity.type === 'transaction' && `${activity.from} → ${activity.to}`}
                                                                        {activity.type === 'request_accepted' && `✓ ${activity.from} → ${activity.to}`}
                                                                        {activity.type === 'request_rejected' && `✗ ${activity.from} ⇢ ${activity.to}`}
                                                                        {activity.type === 'dice_roll' && `🎲 ${activity.from} rolled dice`}
                                                                    </Text>
                                                                    {activity.description && (
                                                                        <Text size="xs" c="dimmed" opacity={0.6}>{activity.description}</Text>
                                                                    )}
                                                                    <Text size="xs" c="dimmed" opacity={0.5} style={{ fontSize: '0.7rem' }}>
                                                                        {timeAgo}
                                                                    </Text>
                                                                </div>
                                                                {activity.type !== 'dice_roll' && (
                                                                    <Text
                                                                        size="xs"
                                                                        fw={600}
                                                                        c={activity.type === 'request_rejected' ? 'red' : undefined}
                                                                        style={{ textDecoration: activity.type === 'request_rejected' ? 'line-through' : 'none' }}
                                                                    >
                                                                        ${activity.amount}
                                                                    </Text>
                                                                )}
                                                                {activity.type === 'dice_roll' && (
                                                                    <Badge size="lg" variant="light" color="orange">
                                                                        {activity.payload.roll}
                                                                    </Badge>
                                                                )}
                                                            </Group>
                                                        );
                                                    })
                                                )}
                                            </Stack>
                                            {totalPages > 1 && (
                                                <Group justify="center" mt="sm" gap="xs">
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                                                        disabled={activityPage === 0}
                                                    >
                                                        Previous
                                                    </Button>
                                                    <Text size="xs" c="dimmed">
                                                        Page {activityPage + 1} of {totalPages}
                                                    </Text>
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        onClick={() => setActivityPage(p => Math.min(totalPages - 1, p + 1))}
                                                        disabled={activityPage === totalPages - 1}
                                                    >
                                                        Next
                                                    </Button>
                                                </Group>
                                            )}
                                        </>
                                    );
                                })()}
                            </Paper>
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Stack >

            {/* Send Money Modal */}
            < Modal opened={sendModalOpen} onClose={() => setSendModalOpen(false)
            } title="Send Money" >
                <SendMoneyForm
                    roomId={room.id}
                    room={room}
                    players={players}
                    currentPlayerId={currentPlayer.id}
                    onClose={() => { setSendModalOpen(false); setDefaultRecipientId(null); }}
                    modalOpen={sendModalOpen}
                    initialRecipientId={defaultRecipientId}
                    onToast={showToast}
                />
            </Modal >

            {/* Request Modal */}
            < Modal opened={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Payment" >
                <RequestMoneyForm
                    roomId={room.id}
                    players={players}
                    currentPlayerId={currentPlayer.id}
                    onClose={() => { setRequestModalOpen(false); setDefaultRequestPayerId(null); }}
                    modalOpen={requestModalOpen}
                    initialPayerId={defaultRequestPayerId}
                />
            </Modal >

            <BankServicesModal
                opened={bankServicesModalOpen}
                onClose={() => setBankServicesModalOpen(false)}
                room={room}
                currentPlayer={currentPlayer}
            />

            {/* QR Request Modal */}
            < Modal opened={qrModalOpen} onClose={() => setQrModalOpen(false)} title="QR Payment Request" >
                <QRRequestForm
                    roomCode={room.room_code}
                    currentPlayerId={currentPlayer.id}
                />
            </Modal >

            {/* Scan Modal */}
            < Modal opened={scanModalOpen} onClose={() => setScanModalOpen(false)} title="Scan QR Code" >
                <ScanQRForm
                    onClose={() => setScanModalOpen(false)}
                    roomId={room.id}
                    currentPlayerId={currentPlayer.id}
                />
            </Modal >

            <Affix position={{ bottom: 20, left: 0, right: 0 }} zIndex={1000} style={{ pointerEvents: 'none' }}>
                <Container size="xs" style={{ pointerEvents: 'auto' }}>
                    <Transition transition="slide-up" mounted={!!toast}>
                        {(styles) => (
                            <Paper
                                style={styles}
                                p="lg"
                                radius="md"
                                withBorder
                                shadow="xl"
                                bg="var(--mantine-color-dark-7)"
                            >
                                <Group>
                                    <Text size="xl">{toast?.color === 'green' ? '💰' : toast?.color === 'red' ? '⚠️' : '🎲'}</Text>
                                    <div>
                                        <Text fw={700} size="lg" c={toast?.color || 'orange'}>{toast?.title}</Text>
                                        <Text size="md">{toast?.message}</Text>
                                    </div>
                                </Group>
                            </Paper>
                        )}
                    </Transition>
                </Container>
            </Affix>
        </Container >
    );
}

function ScanQRForm({ onClose, roomId, currentPlayerId }: { onClose: () => void, roomId: string, currentPlayerId: string }) {
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

function SendMoneyForm({ roomId, players, currentPlayerId, room, onClose, modalOpen, initialRecipientId, onToast }: any) {
    const [amount, setAmount] = useState<number | string | null>(null);
    const [toPlayerId, setToPlayerId] = useState<string | null>(initialRecipientId || null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Reset form when modal closes or opens
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
        </Stack >
    );
}

function RequestMoneyForm({ roomId, players, currentPlayerId, onClose, modalOpen, initialPayerId }: any) {
    const [amount, setAmount] = useState<number | string | null>(null);
    const [fromPlayerId, setFromPlayerId] = useState<string | null>(initialPayerId || null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset form when modal closes or opens
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

function QRRequestForm({ roomCode, currentPlayerId }: { roomCode: string, currentPlayerId: string }) {
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

function BankServicesModal({ opened, onClose, room, currentPlayer }: { opened: boolean; onClose: () => void; room: Room; currentPlayer: Player }) {
    const [activeTab, setActiveTab] = useState<string | null>('loans');
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Property Improvement State
    const [propertyType, setPropertyType] = useState<'property' | 'house' | 'hotel'>('property');
    const [propertyName, setPropertyName] = useState('');
    const [amount, setAmount] = useState<number | string | null>(null);
    const [payLoading, setPayLoading] = useState(false);
    const [propertyHistory, setPropertyHistory] = useState<any[]>([]);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const data = await getLoans(room.id);
            // Filter for current player
            setLoans(data?.filter((l: any) => l.player_id === currentPlayer.id) || []);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (opened) {
            fetchLoans();
        }
    }, [opened]);

    const handleRepay = async (loanId: string, repayAmount: number) => {
        if (!confirm(`Repay $${repayAmount}?`)) return;
        try {
            await repayLoan(loanId, repayAmount, room.id);
            fetchLoans();
        } catch (error) {
            console.error(error);
            alert('Repayment failed. Check funds.');
        }
    };

    const handlePropertyTransaction = async () => {
        if (!amount || !propertyName) return;
        setPayLoading(true);
        try {
            let description = '';
            switch (propertyType) {
                case 'property':
                    description = `Bought Property: ${propertyName}`;
                    break;
                case 'house':
                    description = `Bought House on ${propertyName}`;
                    break;
                case 'hotel':
                    description = `Bought Hotel on ${propertyName}`;
                    break;
            }

            await createTransaction(room.id, 'player_to_bank', Number(amount), description, currentPlayer.id, undefined);

            // Add to history
            setPropertyHistory(prev => [{ type: propertyType, name: propertyName, amount: Number(amount), timestamp: new Date() }, ...prev]);

            // Reset form
            setPropertyName('');
            setAmount(null);
        } catch (error) {
            console.error(error);
            alert('Payment failed. Check funds.');
        }
        setPayLoading(false);
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Bank Services" size="lg">
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="md">
                    <Tabs.Tab value="loans" leftSection={<IconCoin size={16} />}>
                        My Loans
                    </Tabs.Tab>
                    <Tabs.Tab value="improvements" leftSection={<IconBuildingEstate size={16} />}>
                        Property Improvements
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="loans">
                    <Stack gap="md">
                        <Group justify="flex-end">
                            <Button variant="subtle" size="xs" leftSection={<IconRefresh size={14} />} onClick={fetchLoans} loading={loading}>
                                Refresh
                            </Button>
                        </Group>

                        {loans.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">You have no active loans.</Text>
                        ) : (
                            <ScrollArea h={300}>
                                <Stack gap="sm">
                                    {loans.map((loan) => (
                                        <Paper key={loan.id} p="sm" withBorder>
                                            <Group justify="space-between" align="flex-start">
                                                <div>
                                                    <Text fw={600}>{loan.description}</Text>
                                                    <Text size="xs" c="dimmed">{new Date(loan.created_at).toLocaleDateString()}</Text>
                                                </div>
                                                <Stack align="flex-end" gap="xs">
                                                    <Text fw={700} size="lg" c="red">-${loan.amount}</Text>
                                                    <Button size="xs" variant="light" color="blue" onClick={() => handleRepay(loan.id, loan.amount)}>
                                                        Repay Full
                                                    </Button>
                                                </Stack>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        )}
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="improvements">
                    <Stack gap="md">
                        <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-blue-9)' }}>
                            <Group>
                                <IconBuildingEstate color="white" />
                                <Text size="sm" c="white">Purchase properties, houses, hotels, and other improvements.</Text>
                            </Group>
                        </Paper>

                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                            <Paper
                                p="md"
                                radius="md"
                                withBorder
                                style={{
                                    cursor: 'pointer',
                                    borderWidth: '2px',
                                    borderColor: propertyType === 'property' ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-dark-4)',
                                    backgroundColor: propertyType === 'property' ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-6)',
                                    transition: 'all 0.2s ease',
                                    transform: propertyType === 'property' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: propertyType === 'property' ? '0 0 0 3px rgba(77, 171, 247, 0.2)' : 'none'
                                }}
                                onClick={() => setPropertyType('property')}
                            >
                                <Stack gap="xs" align="center">
                                    <IconBuildingEstate size={24} />
                                    <Text size="sm" fw={600} ta="center" c={propertyType === 'property' ? 'white' : undefined}>
                                        Buy Property
                                    </Text>
                                </Stack>
                            </Paper>

                            <Paper
                                p="md"
                                radius="md"
                                withBorder
                                style={{
                                    cursor: 'pointer',
                                    borderWidth: '2px',
                                    borderColor: propertyType === 'house' ? 'var(--mantine-color-green-5)' : 'var(--mantine-color-dark-4)',
                                    backgroundColor: propertyType === 'house' ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-6)',
                                    transition: 'all 0.2s ease',
                                    transform: propertyType === 'house' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: propertyType === 'house' ? '0 0 0 3px rgba(64, 192, 87, 0.2)' : 'none'
                                }}
                                onClick={() => setPropertyType('house')}
                            >
                                <Stack gap="xs" align="center">
                                    <IconHome size={24} />
                                    <Text size="sm" fw={600} ta="center" c={propertyType === 'house' ? 'white' : undefined}>
                                        Buy House
                                    </Text>
                                </Stack>
                            </Paper>

                            <Paper
                                p="md"
                                radius="md"
                                withBorder
                                style={{
                                    cursor: 'pointer',
                                    borderWidth: '2px',
                                    borderColor: propertyType === 'hotel' ? 'var(--mantine-color-grape-5)' : 'var(--mantine-color-dark-4)',
                                    backgroundColor: propertyType === 'hotel' ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-6)',
                                    transition: 'all 0.2s ease',
                                    transform: propertyType === 'hotel' ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: propertyType === 'hotel' ? '0 0 0 3px rgba(190, 75, 219, 0.2)' : 'none'
                                }}
                                onClick={() => setPropertyType('hotel')}
                            >
                                <Stack gap="xs" align="center">
                                    <IconBuildingSkyscraper size={24} />
                                    <Text size="sm" fw={600} ta="center" c={propertyType === 'hotel' ? 'white' : undefined}>
                                        Buy Hotel
                                    </Text>
                                </Stack>
                            </Paper>
                        </SimpleGrid>

                        <Stack gap="md">
                            <TextInput
                                label={propertyType === 'property' ? 'Property Name' : `Property to build ${propertyType === 'house' ? 'house' : 'hotel'} on`}
                                placeholder={propertyType === 'property' ? 'e.g., Boardwalk, Park Place' : 'e.g., Boardwalk'}
                                value={propertyName}
                                onChange={(e) => setPropertyName(e.target.value)}
                                required
                            />

                            <NumberInput
                                label="Amount"
                                placeholder="0"
                                value={amount === null ? '' : amount}
                                onChange={setAmount}
                                min={0}
                                leftSection={<IconCoin size={16} />}
                                required
                            />
                        </Stack>

                        <Button
                            fullWidth
                            size="lg"
                            color={propertyType === 'property' ? 'blue' : propertyType === 'house' ? 'green' : 'grape'}
                            onClick={handlePropertyTransaction}
                            loading={payLoading}
                            disabled={!amount || !propertyName}
                        >
                            {propertyType === 'property' ? 'Buy Property' : propertyType === 'house' ? 'Buy House' : 'Buy Hotel'} - ${amount || 0}
                        </Button>

                        {propertyHistory.length > 0 && (
                            <>
                                <Text size="sm" fw={600} mt="md">Recent Property Purchases</Text>
                                <ScrollArea h={150}>
                                    <Stack gap="xs">
                                        {propertyHistory.map((item, idx) => (
                                            <Paper key={idx} p="xs" withBorder>
                                                <Group justify="space-between">
                                                    <Stack gap={0}>
                                                        <Text size="sm" fw={500}>
                                                            {item.type === 'property' ? '🏘️' : item.type === 'house' ? '🏠' : '🏨'} {item.name}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {item.type === 'property' ? 'Property' : item.type === 'house' ? 'House' : 'Hotel'}
                                                        </Text>
                                                    </Stack>
                                                    <Text size="sm" fw={600}>${item.amount}</Text>
                                                </Group>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </ScrollArea>
                            </>
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>
        </Modal>
    );
}
