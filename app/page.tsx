'use client'

import { Container, Title, Text, Button, Group, Stack, Paper } from '@mantine/core';
import { IconBuildingBank, IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

import { signInAsGuest } from '@/utils/auth';

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const signIn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await signInAsGuest(supabase);
      }
      setLoading(false);
    };
    signIn();
  }, []);

  if (loading) {
    return (
      <Container size="xs" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="xs" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper p="xl" radius="lg" withBorder w="100%">
        <Stack align="center" gap="xl">
          <Title order={1} style={{ fontSize: '3rem' }}>Banko 💸</Title>
          <Text c="dimmed" ta="center">
            The digital banker for your board games.
            No more paper money, just fun.
          </Text>

          <Group w="100%" grow>
            <Button
              component={Link}
              href="/create"
              size="xl"
              color="violet"
              leftSection={<IconBuildingBank size={24} />}
            >
              Create Room
            </Button>
          </Group>

          <Button
            component={Link}
            href="/join"
            variant="light"
            size="lg"
            fullWidth
            leftSection={<IconUserPlus size={20} />}
          >
            Join Existing Room
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
