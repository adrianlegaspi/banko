'use client'

import { Container, Title, Text, Group, Stack, Paper, Badge, Avatar, Button, Modal, NumberInput, Select, Textarea } from '@mantine/core';
import { IconSend, IconReceipt2, IconQrcode } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
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
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
    const router = useRouter();

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
                <Paper
                    p="xl"
                    radius="lg"
                    withBorder
                    style={{
                        background: 'linear-gradient(135deg, var(--mantine-color-violet-9) 0%, var(--mantine-color-grape-9) 100%)',
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
                                <Text fw={600} size="lg">{currentPlayer.nickname}</Text>
                            </Stack>
                        </Group>
                        <Text size="xl" fw={700} style={{ opacity: 0.5, letterSpacing: '2px' }}>•••• {room.room_code}</Text>
                    </Group>
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
                <Stack gap="sm">
                    <Group grow>
                        <Button leftSection={<IconSend size={18} />} onClick={() => setSendModalOpen(true)}>
                            Send
                        </Button>
                        <Button leftSection={<IconReceipt2 size={18} />} variant="light" onClick={() => setRequestModalOpen(true)}>
                            Request
                        </Button>
                    </Group>
                    <Group grow>
                        <Button leftSection={<IconQrcode size={18} />} variant="outline" onClick={() => setQrModalOpen(true)}>
                            QR Request
                        </Button>
                        <Button leftSection={<IconQrcode size={18} />} color="grape" onClick={() => setScanModalOpen(true)}>
                            Scan
                        </Button>
                    </Group>
                </Stack>

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
                                    {(() => {
                                        // Combine transactions and payment requests into unified activity feed
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
                                                }))
                                        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                                        const [activityPage, setActivityPage] = useState(0);
                                        const itemsPerPage = 8;
                                        const totalPages = Math.ceil(allActivity.length / itemsPerPage);
                                        const paginatedActivity = allActivity.slice(activityPage * itemsPerPage, (activityPage + 1) * itemsPerPage);

                                        return (
                                            <>
                                                <Stack gap="xs">
                                                    {paginatedActivity.length === 0 ? (
                                                        <Text size="sm" c="dimmed" ta="center" py="md">No activity yet</Text>
                                                    ) : (
                                                        paginatedActivity.map((activity: any) => (
                                                            <Group key={activity.id} justify="space-between" p="xs" style={{ fontSize: '0.85rem' }}>
                                                                <div>
                                                                    <Text size="xs" c="dimmed">
                                                                        {activity.type === 'transaction' && `${activity.from} → ${activity.to}`}
                                                                        {activity.type === 'request_accepted' && `✓ ${activity.from} → ${activity.to}`}
                                                                        {activity.type === 'request_rejected' && `✗ ${activity.from} ⇢ ${activity.to}`}
                                                                    </Text>
                                                                    {activity.description && (
                                                                        <Text size="xs" c="dimmed" opacity={0.6}>{activity.description}</Text>
                                                                    )}
                                                                </div>
                                                                <Text
                                                                    size="xs"
                                                                    fw={600}
                                                                    c={activity.type === 'request_rejected' ? 'red' : undefined}
                                                                    style={{ textDecoration: activity.type === 'request_rejected' ? 'line-through' : 'none' }}
                                                                >
                                                                    ${activity.amount}
                                                                </Text>
                                                            </Group>
                                                        ))
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
                                </Group>
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

            {/* QR Request Modal */}
            <Modal opened={qrModalOpen} onClose={() => setQrModalOpen(false)} title="QR Payment Request">
                <QRRequestForm
                    roomCode={room.room_code}
                    currentPlayerId={currentPlayer.id}
                />
            </Modal>

            {/* Scan Modal */}
            <Modal opened={scanModalOpen} onClose={() => setScanModalOpen(false)} title="Scan QR Code">
                <ScanQRForm onClose={() => setScanModalOpen(false)} />
            </Modal>
        </Container >
    );
}

function ScanQRForm({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);

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

                    // Use the back camera if available, otherwise use the first camera
                    const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;

                    await html5QrCode.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 }
                        },
                        (decodedText) => {
                            console.log(`Scan result: ${decodedText}`);
                            html5QrCode?.stop().then(() => {
                                onClose();
                                // Navigate to payment page
                                try {
                                    const url = new URL(decodedText);
                                    if (url.pathname.includes('/pay')) {
                                        router.push(url.pathname + url.search);
                                    } else {
                                        alert('Invalid Banko QR Code');
                                    }
                                } catch (e) {
                                    if (decodedText.includes('/pay')) {
                                        router.push(decodedText);
                                    } else {
                                        alert('Invalid QR Code format');
                                    }
                                }
                            });
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
    }, [onClose, router]);

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
            {scanning && <Text size="xs" c="dimmed">Point camera at a Banko QR code</Text>}
        </Stack>
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

function QRRequestForm({ roomCode, currentPlayerId }: { roomCode: string, currentPlayerId: string }) {
    const [amount, setAmount] = useState<number | string>('');

    // Construct the URL: /room/[code]/pay?to=[id]&amount=[amount]
    // We use window.location.origin to get the full URL if on client, but for SSR safety we can just use relative or construct it carefully.
    // Since this is a client component, window is available.

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
                value={amount}
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
