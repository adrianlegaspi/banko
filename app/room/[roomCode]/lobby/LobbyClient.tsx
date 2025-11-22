'use client'

import { Container, Title, Text, Button, Stack, Paper, Group, Badge, Avatar } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Room, Player } from '@/app/actions';
import { startGame } from '@/app/actions';

type Props = {
    room: Room;
    currentPlayer: Player;
    players: Player[];
};

export default function LobbyClient({ room, currentPlayer, players: initialPlayers }: Props) {
    const [players, setPlayers] = useState(initialPlayers);
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel('lobby')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, (payload) => {
                console.log('Player change:', payload);
                // Refetch or update locally
                supabase.from('players').select('*').eq('room_id', room.id).then(({ data }) => {
                    if (data) setPlayers(data);
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (payload: any) => {
                if (payload.new.status === 'in_progress') {
                    window.location.href = `/room/${room.room_code}/game`;
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room.id, room.room_code, supabase]);

    const handleStart = async () => {
        await startGame(room.room_code);
    };

    return (
        <Container size="sm" py="xl">
            <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                    <div>
                        <Group justify="space-between" mb="xs">
                            <Title order={2}>{room.room_name}</Title>
                            <Badge size="lg" color="violet">{room.room_code}</Badge>
                        </Group>
                        <Text c="dimmed">Share the room code with your friends!</Text>
                    </div>

                    <div>
                        <Text fw={600} mb="sm">Players ({players.length})</Text>
                        <Stack gap="xs">
                            {players.map((p) => (
                                <Group key={p.id} justify="space-between" p="sm" style={{ border: '1px solid var(--mantine-color-dark-4)', borderRadius: 'var(--mantine-radius-sm)' }}>
                                    <Group gap="sm">
                                        <Avatar color={p.color} radius="xl">{p.nickname[0]}</Avatar>
                                        <Text>{p.nickname}</Text>
                                    </Group>
                                    {p.is_bank_operator && <Badge size="sm" color="yellow">Bank Operator</Badge>}
                                </Group>
                            ))}
                        </Stack>
                    </div>

                    {currentPlayer.is_bank_operator && (
                        <Button
                            size="xl"
                            color="violet"
                            leftSection={<IconPlayerPlay size={24} />}
                            onClick={handleStart}
                            disabled={players.length < 2}
                        >
                            Start Game
                        </Button>
                    )}

                    {!currentPlayer.is_bank_operator && (
                        <Text ta="center" c="dimmed">Waiting for the bank operator to start...</Text>
                    )}
                </Stack>
            </Paper>
        </Container>
    );
}
