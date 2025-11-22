'use client'

import { Paper, Group, Text, Title, Stack, Avatar, Badge } from '@mantine/core';
import { IconQrcode } from '@tabler/icons-react';
import type { Player, Room } from '@/app/actions';

interface PlayerBalanceCardProps {
    currentPlayer: Player;
    room: Room;
    balance: number;
    isDefeated: boolean;
}

export default function PlayerBalanceCard({ currentPlayer, room, balance, isDefeated }: PlayerBalanceCardProps) {
    return (
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
                    ${balance.toLocaleString()}
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
    );
}
