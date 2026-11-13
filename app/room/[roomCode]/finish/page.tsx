import { getRoomByCode, getPlayers } from '@/app/actions';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import FinalStandings from '@/components/game/FinalStandings';
export default async function FinishPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const room = await getRoomByCode(roomCode);
  if (!room) redirect('/');
  if (room.status !== 'finished') redirect('/room/' + roomCode + '/game');
  const players = (await getPlayers(room.id)) ?? [];
  return <FinalStandings room={room} players={players} />;
}
