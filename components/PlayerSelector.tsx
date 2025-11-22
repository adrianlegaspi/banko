'use client'

import { Group, Avatar, Text, Paper, SimpleGrid, Stack } from '@mantine/core';
import { IconBuildingBank } from '@tabler/icons-react';
import type { Player, Room } from '@/app/actions';

type PlayerSelectorProps = {
    players: Player[];
    currentPlayerId: string;
    selectedPlayerId: string | null;
    onSelect: (playerId: string | null) => void;
    includeBank?: boolean;
    room?: Room;
};

export default function PlayerSelector({
    players,
    currentPlayerId,
    selectedPlayerId,
    onSelect,
    includeBank = false,
    showDefeated = false,
    room
}: PlayerSelectorProps & { showDefeated?: boolean }) {
    const availablePlayers = players.filter(p => p.id !== currentPlayerId && (showDefeated || p.status !== 'defeated'));

    return (
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            {includeBank && room && (
                <Paper
                    p="md"
                    radius="md"
                    withBorder
                    style={{
                        cursor: 'pointer',
                        borderWidth: '2px',
                        borderColor: selectedPlayerId === null ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-dark-4)',
                        backgroundColor: selectedPlayerId === null ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-6)',
                        transition: 'all 0.2s ease',
                        transform: selectedPlayerId === null ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: selectedPlayerId === null ? '0 0 0 3px rgba(255, 255, 255, 0.2)' : 'none'
                    }}
                    onClick={() => onSelect(null)}
                    onMouseEnter={(e) => {
                        if (selectedPlayerId !== null) {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedPlayerId !== null) {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)';
                        }
                    }}
                >
                    <Stack gap="xs" align="center">
                        <Avatar color="gray" size="lg" radius="xl">
                            <IconBuildingBank size={24} />
                        </Avatar>
                        <Text size="sm" fw={600} ta="center" c={selectedPlayerId === null ? 'white' : undefined}>
                            {room.bank_display_name}
                        </Text>
                        <Text size="xs" c={selectedPlayerId === null ? 'gray.3' : 'dimmed'}>Bank</Text>
                    </Stack>
                </Paper>
            )}
            {availablePlayers.map((player) => (
                <Paper
                    key={player.id}
                    p="md"
                    radius="md"
                    withBorder
                    style={{
                        cursor: 'pointer',
                        borderWidth: '2px',
                        borderColor: selectedPlayerId === player.id ? `var(--mantine-color-${player.color}-5)` : 'var(--mantine-color-dark-4)',
                        backgroundColor: selectedPlayerId === player.id ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-6)',
                        transition: 'all 0.2s ease',
                        transform: selectedPlayerId === player.id ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: selectedPlayerId === player.id ? `0 0 0 3px var(--mantine-color-${player.color}-9)` : 'none'
                    }}
                    onClick={() => onSelect(player.id)}
                    onMouseEnter={(e) => {
                        if (selectedPlayerId !== player.id) {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedPlayerId !== player.id) {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)';
                        }
                    }}
                >
                    <Stack gap="xs" align="center">
                        <Avatar color={player.color} size="lg" radius="xl">
                            {player.nickname[0]}
                        </Avatar>
                        <Text size="sm" fw={600} ta="center" c={selectedPlayerId === player.id ? 'white' : undefined}>
                            {player.nickname}
                        </Text>
                        <Text size="xs" c={selectedPlayerId === player.id ? 'gray.3' : 'dimmed'}>
                            ${player.current_balance}
                        </Text>
                    </Stack>
                </Paper>
            ))}
        </SimpleGrid>
    );
}
