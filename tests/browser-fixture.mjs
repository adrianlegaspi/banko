export const reviewPageSource = `import FinalStandings from '@/components/game/FinalStandings';
import GameClient from '../room/[roomCode]/game/GameClient';
import LobbyClient from '../room/[roomCode]/lobby/LobbyClient';
import PayClient from '../room/[roomCode]/pay/PayClient';
import RoomSetup from '@/components/RoomSetup';
const room = { id: 'room-1', room_code: 'ABC123', room_name: 'Friday night rivals', bank_display_name: 'The Bank', initial_player_balance: 1500, salary_amount: 200, dice_sides: 12, shared_pot_balance: 400, status: 'in_progress' as const, created_at: '2026-11-12T18:00:00Z' };
const players = [{ id: 'player-1', room_id: room.id, supabase_user_id: 'user-1', nickname: 'Adrian', color: 'blue', current_balance: 1500, is_bank_operator: true, status: 'active' as const }, { id: 'player-2', room_id: room.id, supabase_user_id: 'user-2', nickname: 'Julio', color: 'red', current_balance: 1250, is_bank_operator: false, status: 'active' as const }];
export default async function Review({ searchParams }: { searchParams: Promise<{ view?: string }> }) { const { view } = await searchParams; return view === 'finish' ? <FinalStandings room={room} players={players} /> : view === 'lobby' ? <LobbyClient room={{...room,status:'lobby'}} currentPlayer={players[0]} players={players} /> : view === 'pay' ? <PayClient room={room} payer={players[0]} recipient={players[1]} amount={200} /> : view === 'join' ? <RoomSetup joining initialCode="ABC123" /> : <GameClient room={room} currentPlayer={view === 'rival' ? players[1] : players[0]} players={players} transactions={[]} gameEvents={[]} />; }
`;
