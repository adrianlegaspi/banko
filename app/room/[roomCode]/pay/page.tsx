import { createClient } from '@/utils/supabase/server';
import { getRoomByCode, getPlayers } from '@/app/actions';
import { redirect } from 'next/navigation';
import PayClient from './PayClient';

export default async function PayPage({
    params,
    searchParams
}: {
    params: { roomCode: string },
    searchParams: { to: string, amount: string }
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    const room = await getRoomByCode(params.roomCode);
    if (!room) redirect('/');

    const players = await getPlayers(room.id) || [];
    const payer = players.find((p: any) => p.supabase_user_id === user.id);
    const recipient = players.find((p: any) => p.id === searchParams.to);

    if (!payer || !recipient) redirect(`/room/${params.roomCode}/game`);

    const amount = parseFloat(searchParams.amount);
    if (isNaN(amount) || amount <= 0) redirect(`/room/${params.roomCode}/game`);

    return <PayClient room={room} payer={payer} recipient={recipient} amount={amount} />;
}
