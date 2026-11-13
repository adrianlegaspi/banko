import { createClient } from '@/utils/supabase/server';
import { getRoomByCode, getPlayers } from '@/app/actions';
import { redirect } from 'next/navigation';
import PayClient from './PayClient';
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ to?: string; amount?: string }>;
}) {
  const { roomCode } = await params;
  const payment = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const room = await getRoomByCode(roomCode);
  if (!room) redirect('/');
  const players = (await getPlayers(room.id)) ?? [];
  const payer = players.find((player) => player.supabase_user_id === user.id);
  const recipient = players.find((player) => player.id === payment.to);
  const amount = Number(payment.amount);
  if (
    !payer ||
    !recipient ||
    payer.id === recipient.id ||
    payer.status === 'defeated' ||
    recipient.status === 'defeated' ||
    room.status !== 'in_progress' ||
    !Number.isFinite(amount) ||
    amount <= 0
  )
    redirect('/room/' + roomCode + '/game');
  return (
    <PayClient
      room={room}
      payer={payer}
      recipient={recipient}
      amount={amount}
    />
  );
}
