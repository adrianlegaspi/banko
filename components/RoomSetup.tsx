'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronDown, CreditCard, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/AppShell';
import ColorPicker from '@/components/ColorPicker';
import PlayerBalanceCard from '@/components/game/PlayerBalanceCard';
import { createClient } from '@/utils/supabase/client';
import { signInAsGuest } from '@/utils/auth';
export default function RoomSetup({
  joining = false,
  initialCode = '',
}: {
  joining?: boolean;
  initialCode?: string;
}) {
  const [roomCode, setRoomCode] = useState(initialCode.trim().toUpperCase());
  const [roomName, setRoomName] = useState('');
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('blue');
  const [bankName, setBankName] = useState('The Bank');
  const [balance, setBalance] = useState('1500');
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  useEffect(() => {
    if (!joining) return;
    let active = true;
    const timeout = setTimeout(async () => {
      if (roomCode.length !== 6) {
        if (active) setTakenColors([]);
        return;
      }
      const { data: room } = await supabase
        .from('rooms')
        .select('id,bank_display_name,initial_player_balance')
        .eq('room_code', roomCode)
        .maybeSingle();
      if (!active) return;
      if (!room) {
        setTakenColors([]);
        return;
      }
      const { data: players } = await supabase
        .from('players')
        .select('color')
        .eq('room_id', room.id);
      if (active) {
        setTakenColors(players?.map((player) => player.color) ?? []);
        setBankName(room.bank_display_name);
        setBalance(String(room.initial_player_balance));
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [joining, roomCode, supabase]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formValues = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      let {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const result = await signInAsGuest(supabase);
        if (result.error || !result.user)
          throw new Error('Could not connect to the bank. Please try again.');
        user = result.user;
      }
      if (joining) {
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single();
        if (roomError || !room)
          throw new Error('Room not found. Check your six-character code.');
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('room_id', room.id)
          .eq('supabase_user_id', user.id)
          .maybeSingle();
        if (existingPlayer) {
          router.push('/room/' + roomCode + '/lobby');
          return;
        }
        if (room.status !== 'lobby')
          throw new Error('This game has already started or finished.');
        const { data: colorCheck } = await supabase
          .from('players')
          .select('id')
          .eq('room_id', room.id)
          .eq('color', color)
          .maybeSingle();
        if (colorCheck)
          throw new Error(
            'That color was just taken. Choose another card color.',
          );
        const { error: playerError } = await supabase
          .from('players')
          .insert({
            room_id: room.id,
            supabase_user_id: user.id,
            nickname: nickname.trim(),
            color,
            current_balance: room.initial_player_balance,
            is_bank_operator: false,
          });
        if (playerError) throw playerError;
        router.push('/room/' + roomCode + '/lobby');
      } else {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const generatedCode = Array.from(
          crypto.getRandomValues(new Uint8Array(6)),
          (character) => alphabet[character % alphabet.length],
        ).join('');
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .insert({
            room_code: generatedCode,
            room_name: roomName.trim(),
            bank_display_name: bankName.trim(),
            initial_player_balance: Number(balance),
            salary_amount: Number(formValues.get('salaryAmount')),
            dice_sides: Number(formValues.get('diceSides')),
            status: 'lobby',
            shared_pot_balance: 0,
          })
          .select()
          .single();
        if (roomError) throw roomError;
        const { error: playerError } = await supabase
          .from('players')
          .insert({
            room_id: room.id,
            supabase_user_id: user.id,
            nickname: nickname.trim(),
            color,
            current_balance: Number(balance),
            is_bank_operator: true,
          });
        if (playerError) throw playerError;
        router.push('/room/' + generatedCode + '/lobby');
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not connect. Please try again.',
      );
      setSubmitting(false);
    }
  }
  return (
    <AppShell back>
      <div className="setup-layout">
        <section>
          <p className="eyebrow text-primary">
            {joining ? 'PULL UP A CHAIR' : 'YOU CALL THE SHOTS'}
          </p>
          <h1 className="mt-3">
            {joining ? 'Join the table.' : 'Make it game night.'}
          </h1>
          <p className="intro">
            {joining
              ? 'Enter your room code and pick a card. Your seat is waiting.'
              : 'Pick your card. Name your room. Let the good times roll.'}
          </p>
          <form className="setup-form" onSubmit={handleSubmit}>
            <fieldset disabled={submitting} className="form-stack">
              {joining ? (
                <div className="field">
                  <Label htmlFor="roomCode">Room code</Label>
                  <Input
                    id="roomCode"
                    name="roomCode"
                    value={roomCode}
                    maxLength={6}
                    minLength={6}
                    pattern="[A-Z0-9]{6}"
                    onChange={(event) =>
                      setRoomCode(event.target.value.trim().toUpperCase())
                    }
                    placeholder="ABC123"
                    autoComplete="off"
                    className="tracking-[.2em] font-bold"
                    required
                  />
                </div>
              ) : (
                <div className="field">
                  <Label htmlFor="roomName">Room name</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    placeholder="Friday night rivals"
                    required
                    maxLength={80}
                  />
                </div>
              )}
              <div className="field">
                <Label htmlFor="nickname">What should we call you?</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Your player name"
                  maxLength={40}
                  required
                />
              </div>
              <ColorPicker
                value={color}
                onChange={setColor}
                taken={takenColors}
              />
              {joining && takenColors.includes(color) && (
                <p className="text-sm text-destructive">
                  Choose an available card color.
                </p>
              )}
              {!joining && (
                <details className="rules">
                  <summary>
                    <span className="inline-flex items-center gap-2">
                      <ChevronDown size={16} /> Game rules{' '}
                      <span className="text-muted-foreground font-normal">
                        Starting at $1,500
                      </span>
                    </span>
                  </summary>
                  <div className="rules-fields">
                    <div className="field">
                      <Label htmlFor="bankName">Bank name</Label>
                      <Input
                        id="bankName"
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                        required
                        maxLength={60}
                      />
                    </div>
                    <div className="field">
                      <Label htmlFor="balance">Starting balance</Label>
                      <Input
                        id="balance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={balance}
                        onChange={(event) => setBalance(event.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <Label htmlFor="salaryAmount">Pass Go salary</Label>
                      <Input
                        id="salaryAmount"
                        name="salaryAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue="200"
                        required
                      />
                    </div>
                    <div className="field">
                      <Label htmlFor="diceSides">Dice sides</Label>
                      <Input
                        id="diceSides"
                        name="diceSides"
                        type="number"
                        min="2"
                        max="100"
                        defaultValue="12"
                        required
                      />
                    </div>
                  </div>
                </details>
              )}
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={
                  submitting || (joining && takenColors.includes(color))
                }
              >
                {submitting
                  ? 'Connecting to your table...'
                  : joining
                    ? 'Join room'
                    : 'Create room'}
                {joining ? <Users /> : <ArrowUpRight />}
              </Button>
            </fieldset>
          </form>
        </section>
        <aside className="preview-column">
          <p className="eyebrow inline-flex items-center gap-2">
            <CreditCard size={16} /> YOUR GAME NIGHT CARD
          </p>
          <PlayerBalanceCard
            bankName={bankName}
            holderName={nickname}
            color={color}
            balance={Number(balance) || 0}
          />
          <p className="preview-note">
            Your money, with a little personality.
            <br />
            Card color follows you from the lobby to the last deal.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
