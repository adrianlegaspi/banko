'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// --- TYPES ---
export type Room = {
  id: string
  room_code: string
  room_name: string
  bank_display_name: string
  initial_player_balance: number
  salary_amount: number
  status: 'lobby' | 'in_progress' | 'finished'
  shared_pot_balance: number
  dice_sides: number
  created_at: string
}

export type Player = {
  id: string
  room_id: string
  supabase_user_id: string
  nickname: string
  color: string
  current_balance: number
  is_bank_operator: boolean
  status: 'active' | 'defeated'
}

export type TransactionType = 'bank_to_player' | 'player_to_bank' | 'player_to_player' | 'pot_in' | 'pot_out' | 'reversal'

// --- HELPERS ---
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 1, 0 to avoid confusion
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// --- ACTIONS ---

export async function createRoom(formData: FormData) {
  const supabase = await createClient()
  const adminAuthClient = createAdminClient() // Use admin for creation to ensure permissions if needed, but mainly for reliable writes

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('createRoom auth check:', user?.id, authError)
  if (!user) throw new Error('Not authenticated: ' + (authError?.message || 'No user'))

  const roomName = formData.get('roomName') as string
  const bankDisplayName = formData.get('bankDisplayName') as string
  const initialBalance = parseFloat(formData.get('initialBalance') as string)
  const nickname = formData.get('nickname') as string
  const color = formData.get('color') as string

  const roomCode = generateRoomCode()

  // 1. Create Room
  const { data: room, error: roomError } = await adminAuthClient
    .from('rooms')
    .insert({
      room_code: roomCode,
      room_name: roomName,
      bank_display_name: bankDisplayName,
      initial_player_balance: initialBalance,
      status: 'lobby',
      shared_pot_balance: 0,
      dice_sides: Number(formData.get('diceSides')) || 12
    })
    .select()
    .single()

  if (roomError) throw new Error(roomError.message)

  // 2. Create Bank Operator Player
  const { error: playerError } = await adminAuthClient
    .from('players')
    .insert({
      room_id: room.id,
      supabase_user_id: user.id,
      nickname: nickname,
      color: color,
      current_balance: initialBalance,
      is_bank_operator: true
    })

  if (playerError) throw new Error(playerError.message)

  redirect(`/room/${roomCode}/lobby`)
}

export async function joinRoom(formData: FormData) {
  const supabase = await createClient()
  const adminAuthClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const roomCode = (formData.get('roomCode') as string).toUpperCase()
  const nickname = formData.get('nickname') as string
  const color = formData.get('color') as string

  // 1. Find Room
  const { data: room, error: roomError } = await adminAuthClient
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single()

  if (roomError || !room) throw new Error('Room not found')
  if (room.status !== 'lobby') throw new Error('Game already started or finished')

  // 2. Check if already joined (optional, but good UX)
  const { data: existingPlayer } = await adminAuthClient
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .eq('supabase_user_id', user.id)
    .single()

  if (existingPlayer) {
    redirect(`/room/${roomCode}/lobby`)
  }

  // 3. Create Player
  const { error: playerError } = await adminAuthClient
    .from('players')
    .insert({
      room_id: room.id,
      supabase_user_id: user.id,
      nickname: nickname,
      color: color,
      current_balance: room.initial_player_balance,
      is_bank_operator: false
    })

  if (playerError) throw new Error(playerError.message)

  revalidatePath(`/room/${roomCode}/lobby`)
  redirect(`/room/${roomCode}/lobby`)
}

export async function startGame(roomCode: string) {
  const adminAuthClient = createAdminClient()
  
  const { error } = await adminAuthClient
    .from('rooms')
    .update({ status: 'in_progress' })
    .eq('room_code', roomCode)

  if (error) throw new Error(error.message)
  
  revalidatePath(`/room/${roomCode}/lobby`)
  redirect(`/room/${roomCode}/game`)
}

export async function finishGame(roomCode: string) {
  const adminAuthClient = createAdminClient()
  
  const { error } = await adminAuthClient
    .from('rooms')
    .update({ status: 'finished' })
    .eq('room_code', roomCode)

  if (error) throw new Error(error.message)
  
  revalidatePath(`/room/${roomCode}/game`)
  redirect(`/room/${roomCode}/finish`)
}

export async function createTransaction(
  roomId: string,
  type: TransactionType,
  amount: number,
  description: string,
  fromPlayerId?: string,
  toPlayerId?: string
) {
  const adminAuthClient = createAdminClient()

  // Overdraft Protection
  if (['player_to_player', 'player_to_bank', 'pot_in'].includes(type) && fromPlayerId) {
    const { data: player } = await adminAuthClient
      .from('players')
      .select('current_balance')
      .eq('id', fromPlayerId)
      .single()
      
    if (player && player.current_balance < amount) {
      throw new Error(`Insufficient funds. You only have $${player.current_balance}.`)
    }
  }

  // Call RPC
  const { error } = await adminAuthClient.rpc('perform_transaction', {
    p_room_id: roomId,
    p_from_player_id: fromPlayerId || null,
    p_to_player_id: toPlayerId || null,
    p_amount: amount,
    p_type: type,
    p_description: description
  })

  if (error) throw new Error(error.message)
  
  revalidatePath('/room/[roomCode]/game', 'page') // We don't have roomCode here easily, maybe pass it?
  // Or just revalidate everything?
  // Since we use Realtime, revalidation is less critical for the immediate user, but good for consistency.
}

export async function createPaymentRequest(
  roomId: string,
  fromPlayerId: string,
  amount: number,
  description: string,
  toPlayerId?: string // Optional for QR
) {
  const adminAuthClient = createAdminClient()

  const { data, error } = await adminAuthClient
    .from('payment_requests')
    .insert({
      room_id: roomId,
      from_player_id: fromPlayerId,
      to_player_id: toPlayerId || null,
      amount: amount,
      description: description,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function respondToPaymentRequest(
  requestId: string,
  action: 'accepted' | 'rejected',
  payerId: string, // The one paying
  roomCode: string // For revalidation
) {
  const adminAuthClient = createAdminClient()

  // 1. Get Request
  const { data: request, error: reqError } = await adminAuthClient
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqError || !request) throw new Error('Request not found')
  if (request.status !== 'pending') throw new Error('Request already processed')

  // 2. Update Status
  const { error: updateError } = await adminAuthClient
    .from('payment_requests')
    .update({ status: action, to_player_id: payerId }) // Ensure payer is set if it was QR
    .eq('id', requestId)

  if (updateError) throw new Error(updateError.message)

  // 3. If Accepted, Create Transaction
  if (action === 'accepted') {
    // Player to Player
    await createTransaction(
      request.room_id,
      'player_to_player',
      request.amount,
      request.description || 'Payment Request',
      payerId, // From
      request.from_player_id // To
    )
  }
  
  revalidatePath(`/room/${roomCode}/game`)
}

export async function rollDice(roomId: string, playerId: string, sides: number) {
  const adminAuthClient = createAdminClient()
  
  const roll = Math.floor(Math.random() * sides) + 1
  
  const { error } = await adminAuthClient
    .from('game_events')
    .insert({
      room_id: roomId,
      player_id: playerId,
      event_type: 'dice_roll',
      payload: { roll, sides }
    })
    
  if (error) throw new Error(error.message)
  return roll
}

export async function updatePlayerStatus(playerId: string, status: 'active' | 'defeated', roomCode: string) {
  const adminAuthClient = createAdminClient()
  
  const { error } = await adminAuthClient
    .from('players')
    .update({ status })
    .eq('id', playerId)
    
  if (error) throw new Error(error.message)
  
  revalidatePath(`/room/${roomCode}/game`)
}

// --- LOANS ---

export async function createLoan(roomId: string, playerId: string, amount: number, description: string) {
  const adminAuthClient = createAdminClient()

  // 1. Create Loan Record
  const { error: loanError } = await adminAuthClient
    .from('loans')
    .insert({
      room_id: roomId,
      player_id: playerId,
      amount: amount,
      description: description,
      status: 'active'
    })

  if (loanError) throw new Error(loanError.message)

  // 2. Transfer Money (Bank -> Player)
  // Note: Bank has infinite money, so no overdraft check needed for bank
  await createTransaction(roomId, 'bank_to_player', amount, `Loan: ${description}`, undefined, playerId)
}

export async function repayLoan(loanId: string, amount: number, roomId: string) {
  const adminAuthClient = createAdminClient()

  // 1. Get Loan
  const { data: loan, error: loanError } = await adminAuthClient
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single()

  if (loanError || !loan) throw new Error('Loan not found')

  // 2. Transfer Money (Player -> Bank)
  // This will trigger overdraft check in createTransaction
  await createTransaction(roomId, 'player_to_bank', amount, `Loan Repayment: ${loan.description}`, loan.player_id, undefined)

  // 3. Update Loan
  // If fully paid, maybe mark as paid? For now just reduce amount or keep track?
  // The user request implies "tracking".
  // Let's assume "repay" means paying off a chunk.
  // If we want to track the remaining balance, we should probably update the loan amount or have a separate "repaid" field.
  // For simplicity, let's assume we just update the status if fully paid, but the user might want partials.
  // However, the current schema has 'amount'. Let's assume 'amount' is the original amount.
  // Actually, to track "remaining", we might need to update 'amount' or delete the loan if 0.
  // Let's just delete the loan if it's fully paid? Or update amount?
  // Let's update the amount.
  
  const newAmount = Number(loan.amount) - amount
  
  if (newAmount <= 0) {
     await adminAuthClient
      .from('loans')
      .update({ status: 'paid', amount: 0 })
      .eq('id', loanId)
  } else {
     await adminAuthClient
      .from('loans')
      .update({ amount: newAmount })
      .eq('id', loanId)
  }

  revalidatePath(`/room/${roomId}/game`) // Revalidate to show updated loans
}

export async function getLoans(roomId: string) {
  const adminAuthClient = createAdminClient()
  const { data } = await adminAuthClient
    .from('loans')
    .select('*, player:players(nickname)')
    .eq('room_id', roomId)
    .eq('status', 'active')
    .order('created_at')
  return data
}

// --- DATA FETCHING (Server Side) ---

export async function getRoomByCode(code: string) {
  const adminAuthClient = createAdminClient()
  const { data } = await adminAuthClient.from('rooms').select('*').eq('room_code', code).single()
  return data
}

export async function getPlayer(roomId: string, userId: string) {
  const adminAuthClient = createAdminClient()
  const { data } = await adminAuthClient
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('supabase_user_id', userId)
    .single()
  return data
}

export async function getPlayers(roomId: string) {
  const adminAuthClient = createAdminClient()
  const { data } = await adminAuthClient
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('nickname')
  return data
}

export async function getTransactions(roomId: string) {
  const adminAuthClient = createAdminClient()
  const { data } = await adminAuthClient
    .from('transactions')
    .select('*, from_player:players!from_player_id(nickname), to_player:players!to_player_id(nickname)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data
}

export async function getGameEvents(roomId: string) {
  const adminAuthClient = createAdminClient()
  const { data } = await adminAuthClient
    .from('game_events')
    .select('*, player:players(nickname)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data
}

export async function createGuestAccount() {
  const adminAuthClient = createAdminClient()
  
  const randomId = Math.random().toString(36).substring(2, 15)
  const email = `guest_${randomId}@banko.app`
  const password = `banko_guest_${Math.random().toString(36).substring(2)}`

  const { data, error } = await adminAuthClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) throw new Error(error.message)
  
  return { email, password }
}
