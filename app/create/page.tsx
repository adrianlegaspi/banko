'use client'

import { Container, Title, TextInput, NumberInput, Button, Stack, Paper, Loader, Center, Select } from '@mantine/core';
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

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

import { signInAsGuest } from '@/utils/auth';

export default function CreateRoom() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
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

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const formData = new FormData(e.currentTarget);
            const roomName = formData.get('roomName') as string;
            const bankDisplayName = formData.get('bankDisplayName') as string;
            const initialBalance = parseFloat(formData.get('initialBalance') as string);
            const nickname = formData.get('nickname') as string;
            const color = formData.get('color') as string;

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const roomCode = generateRoomCode();

            // 1. Create Room
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .insert({
                    room_code: roomCode,
                    room_name: roomName,
                    bank_display_name: bankDisplayName,
                    initial_player_balance: initialBalance,
                    salary_amount: parseFloat(formData.get('salaryAmount') as string),
                    status: 'lobby',
                    shared_pot_balance: 0,
                    dice_sides: parseInt(formData.get('diceSides') as string) || 12
                })
                .select()
                .single();

            if (roomError) throw roomError;

            // 2. Create Bank Operator Player
            const { error: playerError } = await supabase
                .from('players')
                .insert({
                    room_id: room.id,
                    supabase_user_id: user.id,
                    nickname: nickname,
                    color: color,
                    current_balance: initialBalance,
                    is_bank_operator: true
                });

            if (playerError) throw playerError;

            // Navigate to lobby
            router.push(`/room/${roomCode}/lobby`);
        } catch (err: any) {
            console.error('Error creating room:', err);
            setError(err.message || 'Failed to create room');
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
                <Title order={2} mb="lg">Create New Room</Title>

                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                        <TextInput
                            name="roomName"
                            label="Room Name"
                            placeholder="e.g. Friday Night Monopoly"
                            required
                            disabled={submitting}
                        />

                        <TextInput
                            name="bankDisplayName"
                            label="Bank Name"
                            defaultValue="The Bank"
                            required
                            disabled={submitting}
                        />

                        <NumberInput
                            name="initialBalance"
                            label="Initial Player Balance"
                            defaultValue={1500}
                            min={0}
                            required
                            disabled={submitting}
                        />

                        <NumberInput
                            name="salaryAmount"
                            label="Salary Amount (Pass Go)"
                            defaultValue={200}
                            min={0}
                            required
                            disabled={submitting}
                        />

                        <NumberInput
                            name="diceSides"
                            label="Dice Sides"
                            description="Number of sides on the dice (default 12)"
                            defaultValue={12}
                            min={2}
                            max={100}
                            required
                            disabled={submitting}
                        />

                        <Title order={4} mt="md">Your Player Profile</Title>

                        <TextInput
                            name="nickname"
                            label="Your Nickname"
                            placeholder="Mr. Banker"
                            required
                            disabled={submitting}
                        />

                        <Select
                            name="color"
                            label="Your Color"
                            data={COLORS}
                            defaultValue="blue"
                            required
                            allowDeselect={false}
                            disabled={submitting}
                        />

                        {error && <div style={{ color: 'red' }}>{error}</div>}

                        <Button
                            type="submit"
                            size="lg"
                            loading={submitting}
                            loaderProps={{ type: 'dots' }}
                            fullWidth
                            color="violet"
                        >
                            {submitting ? 'Creating Room...' : 'Create Room'}
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
