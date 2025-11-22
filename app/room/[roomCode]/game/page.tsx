import { getRoomByCode, getPlayer, getPlayers, getTransactions, getGameEvents } from '@/app/actions';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import GameClient from './GameClient';

export default async function GamePage({ params }: { params: { roomCode: string } }) {
    const { roomCode } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const room = await getRoomByCode(roomCode);
    if (!room) redirect('/');
    if (room.status === 'lobby') redirect(`/room/${roomCode}/lobby`);
    if (room.status === 'finished') redirect(`/room/${roomCode}/finish`);

    const player = await getPlayer(room.id, user.id);
    if (!player) redirect('/');

    const players = await getPlayers(room.id);
    const transactions = await getTransactions(room.id);
    const gameEvents = await getGameEvents(room.id);

    return (
        <GameClient
            room={room}
            currentPlayer={player}
            players={players || []}
            transactions={transactions || []}
            gameEvents={gameEvents || []}
        />
    );
}
