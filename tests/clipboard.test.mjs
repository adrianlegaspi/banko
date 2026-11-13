import test from 'node:test';
import assert from 'node:assert/strict';
import { copyText } from '../lib/clipboard.ts';
test('awaits clipboard completion before reporting success', async () => {
  let copied = '';
  await copyText('ABC123', {
    writeText: async (value) => {
      copied = value;
    },
  });
  assert.equal(copied, 'ABC123');
});
test('clipboard rejection exposes selectable fallback', async () => {
  await assert.rejects(
    copyText('ABC123', {
      writeText: async () => {
        throw new Error('Denied');
      },
    }),
    /Select and copy/,
  );
});
test('missing clipboard exposes selectable fallback', async () => {
  await assert.rejects(copyText('ABC123', undefined), /Select and copy/);
});
