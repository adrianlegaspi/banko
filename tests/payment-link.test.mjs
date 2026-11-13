import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaymentLink } from '../lib/payment-link.ts';
const origin = 'https://banko.example';
const validLink = origin + '/room/ABC123/pay?to=player-2&amount=200';
test('scanned payment opens review without changing the amount or recipient', () => {
  assert.deepEqual(parsePaymentLink(validLink, origin, 'ABC123'), {
    recipientId: 'player-2',
    amount: 200,
    path: '/room/ABC123/pay?to=player-2&amount=200',
  });
});
for (const invalidLink of [
  validLink.replace('banko.example', 'foreign.example'),
  validLink.replace('ABC123', 'OTHER1'),
  validLink.replace('/pay?', '/pay/extra?'),
  validLink.replace('amount=200', 'amount=Infinity'),
  validLink.replace('amount=200', 'amount=-1'),
  validLink.replace('amount=200', 'amount=0'),
  validLink.replace('to=player-2', 'to='),
  'not a URL',
])
  test('rejects invalid payment: ' + invalidLink, () => {
    assert.throws(() => parsePaymentLink(invalidLink, origin, 'ABC123'));
  });
