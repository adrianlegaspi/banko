import { getRoomByCode, getPlayers } from '@/app/actions';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Container, Title, Text, Stack, Paper, Group, Badge, Avatar, Button } from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';
import Link from 'next/link';

export default async function FinishPage({ params }: { params: { roomCode: string } }) {
    const { roomCode } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const room = await getRoomByCode(roomCode);
    if (!room) redirect('/');

    const players = (await getPlayers(room.id)) || [];
    const sortedPlayers = [...players].sort((a, b) => b.current_balance - a.current_balance);

    return (
        <Container size="sm" py="xl">
            <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg" align="center">
                    <IconTrophy size={64} color="gold" />
                    <Title order={1}>Game Over!</Title>
                    <Text c="dimmed">{room.room_name}</Text>

                    <Stack gap="md" w="100%">
                        <Text fw={600} size="lg">Final Standings</Text>
                        {sortedPlayers.map((p, idx) => (
                            <Group key={p.id} justify="space-between" p="md" style={{
                                border: '2px solid var(--mantine-color-dark-4)',
                                borderRadius: 'var(--mantine-radius-md)',
                                background: idx === 0 ? 'var(--mantine-color-yellow-9)' : 'transparent'
                            }}>
                                <Group gap="sm">
                                    <Text fw={700} size="xl">#{idx + 1}</Text>
                                    <Avatar color={p.color} radius="xl">{p.nickname[0]}</Avatar>
                                    <div>
                                        <Text fw={600}>{p.nickname}</Text>
                                        {p.is_bank_operator && <Badge size="xs" color="yellow">Banker</Badge>}
                                    </div>
                                </Group>
                                <Text fw={700} size="xl">${p.current_balance.toLocaleString()}</Text>
                            </Group>
                        ))}
                    </Stack>

                    <Link href="/">
                        <Button size="lg" mt="md">
                            Back to Home
                        </Button>
                    </Link>
                </Stack>
            </Paper>
        </Container>
    );
}
