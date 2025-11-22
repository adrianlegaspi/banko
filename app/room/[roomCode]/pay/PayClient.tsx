'use client';

import { useState } from 'react';
import { Container, Paper, Title, Text, Button, Group, Stack, Avatar, Loader } from '@mantine/core';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { createTransaction } from '@/app/actions';
import { useRouter } from 'next/navigation';

type Props = {
    room: any;
    payer: any;
    recipient: any;
    amount: number;
};

export default function PayClient({ room, payer, recipient, amount }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePayment = async () => {
        setLoading(true);
        try {
            await createTransaction(
                room.id,
                'player_to_player',
                amount,
                'QR Payment',
                payer.id,
                recipient.id
            );
            router.push(`/room/${room.room_code}/game`);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <Container size="xs" py="xl">
            <Paper p="xl" radius="md" withBorder shadow="sm">
                <Stack align="center" gap="lg">
                    <Title order={3}>Confirm Payment</Title>

                    <Group align="center" gap="xl">
                        <Stack align="center" gap="xs">
                            <Avatar size="lg" radius="xl" color={payer.color}>{payer.nickname[0]}</Avatar>
                            <Text fw={600}>{payer.nickname}</Text>
                        </Stack>

                        <IconArrowRight size={32} color="gray" />

                        <Stack align="center" gap="xs">
                            <Avatar size="lg" radius="xl" color={recipient.color}>{recipient.nickname[0]}</Avatar>
                            <Text fw={600}>{recipient.nickname}</Text>
                        </Stack>
                    </Group>

                    <Stack align="center" gap={0}>
                        <Text c="dimmed" size="sm">Amount</Text>
                        <Title order={1}>${amount.toLocaleString()}</Title>
                    </Stack>

                    <Group w="100%" grow>
                        <Button variant="default" onClick={() => router.back()}>Cancel</Button>
                        <Button
                            color="green"
                            size="md"
                            loading={loading}
                            onClick={handlePayment}
                            leftSection={<IconCheck size={20} />}
                        >
                            Pay Now
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        </Container>
    );
}
