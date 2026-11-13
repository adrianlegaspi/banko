export function parsePaymentLink(
  value: string,
  origin: string,
  roomCode: string,
) {
  const paymentUrl = new URL(value);
  const recipientId = paymentUrl.searchParams.get('to');
  const amount = Number(paymentUrl.searchParams.get('amount'));
  if (
    paymentUrl.origin !== origin ||
    paymentUrl.username ||
    paymentUrl.password ||
    paymentUrl.pathname !== '/room/' + roomCode + '/pay' ||
    !recipientId ||
    !Number.isFinite(amount) ||
    amount <= 0
  )
    throw new Error('Scan a payment QR from this room.');
  return {
    recipientId,
    amount,
    path:
      paymentUrl.pathname +
      '?' +
      new URLSearchParams({ to: recipientId, amount: String(amount) }),
  };
}
