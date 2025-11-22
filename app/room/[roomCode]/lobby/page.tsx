import { getRoomByCode, getPlayer, getPlayers, startGame } from '@/app/actions';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import LobbyClient from './LobbyClient';

export default async function LobbyPage({ params }: { params: { roomCode: string } }) {
    const { roomCode } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const room = await getRoomByCode(roomCode);
    if (!room) redirect('/');
    if (room.status !== 'lobby') redirect(`/room/${roomCode}/game`);

    const player = await getPlayer(room.id, user.id);
    if (!player) redirect(`/join?code=${roomCode}`);

    const players = await getPlayers(room.id);

    return <LobbyClient room={room} currentPlayer={player} players={players || []} />;
}
