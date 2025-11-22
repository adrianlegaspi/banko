'use client'

import { Container, Title, TextInput, Button, Select, Stack, Paper, Loader, Center } from '@mantine/core';
import { useEffect, useState, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

const COLORS = [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'orange', label: 'Orange' },
    { value: 'grape', label: 'Purple' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'pink', label: 'Pink' },
];

import { signInAsGuest } from '@/utils/auth';

export default function JoinRoom() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [takenColors, setTakenColors] = useState<string[]>([]);
    const [availableColors, setAvailableColors] = useState(COLORS);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { error } = await signInAsGuest(supabase);
                if (error) {
                    setError('Failed to authenticate. Please refresh.');
                    setLoading(false);
                    return;
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, [supabase]);

    // Fetch taken colors when room code changes
    useEffect(() => {
        const fetchTakenColors = async () => {
            if (!roomCode || roomCode.length < 3) {
                setTakenColors([]);
                setAvailableColors(COLORS);
                return;
            }

            try {
                // Find room
                const { data: room } = await supabase
                    .from('rooms')
                    .select('id')
                    .eq('room_code', roomCode.toUpperCase())
                    .single();

                if (room) {
                    // Get existing players
                    const { data: players } = await supabase
                        .from('players')
                        .select('color')
                        .eq('room_id', room.id);

                    const taken = players?.map(p => p.color) || [];
                    setTakenColors(taken);
                    setAvailableColors(COLORS.filter(c => !taken.includes(c.value)));
                } else {
                    setTakenColors([]);
                    setAvailableColors(COLORS);
                }
            } catch (err) {
                console.error('Error fetching taken colors:', err);
            }
        };

        const debounce = setTimeout(fetchTakenColors, 300);
        return () => clearTimeout(debounce);
    }, [roomCode, supabase]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const formData = new FormData(e.currentTarget);
            const code = (formData.get('roomCode') as string).toUpperCase();
            const nickname = formData.get('nickname') as string;
            const color = formData.get('color') as string;

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Find Room
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('room_code', code)
                .single();

            if (roomError || !room) throw new Error('Room not found');
            if (room.status !== 'lobby') throw new Error('Game already started or finished');

            // 2. Check if already joined
            const { data: existingPlayer } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', room.id)
                .eq('supabase_user_id', user.id)
                .single();

            if (existingPlayer) {
                router.push(`/room/${code}/lobby`);
                return;
            }

            // 3. Check if color is taken
            const { data: colorCheck } = await supabase
                .from('players')
                .select('color')
                .eq('room_id', room.id)
                .eq('color', color)
                .single();

            if (colorCheck) {
                throw new Error('This color is already taken. Please choose another.');
            }

            // 4. Create Player
            const { error: playerError } = await supabase
                .from('players')
                .insert({
                    room_id: room.id,
                    supabase_user_id: user.id,
                    nickname: nickname,
                    color: color,
                    current_balance: room.initial_player_balance,
                    is_bank_operator: false
                });

            if (playerError) throw playerError;

            // Navigate to lobby
            router.push(`/room/${code}/lobby`);
        } catch (err: any) {
            console.error('Error joining room:', err);
            setError(err.message || 'Failed to join room');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Center h="100vh">
                <Loader size="xl" />
            </Center>
        );
    }

    return (
        <Container size="xs" py="xl">
            <Button component={Link} href="/" variant="subtle" leftSection={<IconArrowLeft size={16} />} mb="md">
                Back
            </Button>

            <Paper p="xl" radius="md" withBorder>
                <Title order={2} mb="lg">Join Room</Title>

                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                        <TextInput
                            name="roomCode"
                            label="Room Code"
                            placeholder="e.g. ABC123"
                            required
                            styles={{ input: { textTransform: 'uppercase' } }}
                            disabled={submitting}
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.currentTarget.value)}
                        />

                        <TextInput
                            name="nickname"
                            label="Your Nickname"
                            placeholder="Player 1"
                            required
                            disabled={submitting}
                        />

                        <Select
                            name="color"
                            label="Your Color"
                            data={availableColors}
                            defaultValue={availableColors.length > 0 ? availableColors[0].value : undefined}
                            required
                            allowDeselect={false}
                            disabled={submitting || availableColors.length === 0}
                            description={takenColors.length > 0 ? `Taken: ${takenColors.map(c => COLORS.find(col => col.value === c)?.label).join(', ')}` : undefined}
                        />

                        {error && <div style={{ color: 'red' }}>{error}</div>}

                        <Button
                            type="submit"
                            size="lg"
                            loading={submitting}
                            fullWidth
                            color="violet"
                        >
                            {submitting ? 'Joining Room...' : 'Join Room'}
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
