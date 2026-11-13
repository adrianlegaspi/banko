import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { reviewPageSource } from './browser-fixture.mjs';
const room = {
  id: 'room-1',
  room_code: 'ABC123',
  room_name: 'Friday night rivals',
  bank_display_name: 'The Bank',
  initial_player_balance: 1500,
  salary_amount: 200,
  dice_sides: 12,
  shared_pot_balance: 400,
  status: 'in_progress',
};
const players = [
  {
    id: 'player-1',
    room_id: 'room-1',
    supabase_user_id: 'user-1',
    nickname: 'Adrian',
    color: 'blue',
    current_balance: 1500,
    is_bank_operator: true,
    status: 'active',
  },
  {
    id: 'player-2',
    room_id: 'room-1',
    supabase_user_id: 'user-2',
    nickname: 'Julio',
    color: 'red',
    current_balance: 1250,
    is_bank_operator: false,
    status: 'active',
  },
];
test(
  'responsive screens and banking interactions',
  { skip: process.env.BANKO_BROWSER_TESTS !== '1', timeout: 180000 },
  async () => {
    const fixtureDirectory = new URL('../app/ui-review/', import.meta.url);
    await mkdir(fixtureDirectory, { recursive: true });
    await writeFile(new URL('page.tsx', fixtureDirectory), reviewPageSource, {
      flag: 'wx',
    });
    const browser = await chromium.launch({ headless: true, channel: process.env.BANKO_BROWSER_CHANNEL || undefined });
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      let currentRoom = { ...room };
      let currentPlayers = players.map((player) => ({ ...player }));
      let activityCount = 1;
      const sockets = [];
      const handleRequest = async (route) => {
        const request = route.request();
        const requestUrl = new URL(request.url());
        if (requestUrl.hostname === 'localhost') {
          if (request.method() === 'POST') return route.abort();
          return route.continue();
        }
        let response = [];
        if (requestUrl.pathname.includes('/rooms')) response = currentRoom;
        if (requestUrl.pathname.includes('/players'))
          response =
            requestUrl.searchParams.get('select') === 'color'
              ? [{ color: 'red' }]
              : currentPlayers;
        if (requestUrl.pathname.includes('/payment_requests'))
          response = [
            {
              id: 'request-1',
              amount: 100,
              description: 'Rent',
              status: 'pending',
              from_player_id: 'player-2',
              to_player_id: 'player-1',
              created_at: '2026-11-12T18:00:00Z',
              from_player: { nickname: 'Julio' },
            },
            {
              id: 'request-2',
              amount: 50,
              description: 'Old request',
              status: 'rejected',
              from_player_id: 'player-2',
              to_player_id: 'player-1',
              created_at: '2026-11-12T17:00:00Z',
              from_player: { nickname: 'Julio' },
            },
          ];
        if (requestUrl.pathname.includes('/game_events'))
          response = [
            {
              id: 'event-1',
              event_type: 'dice_roll',
              created_at: '2026-11-12T18:01:00Z',
              player_id: 'player-2',
              player: { nickname: 'Julio' },
              payload: { roll1: 3, roll2: 4, total: 7, sides: 6 },
            },
          ];
        if (requestUrl.pathname.includes('/game_events')) {
          response = Array.from({ length: activityCount }, (_, index) => ({ ...response[0], id: 'event-' + index }));
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      };
      await page.route('**/*', handleRequest);
      const handleSocket = (socket) => {
        sockets.push(socket);
        socket.onMessage((message) => {
          const packet = JSON.parse(String(message));
          if (packet.event === 'phx_join') {
            socket.topic = packet.topic;
            socket.changes = packet.payload.config.postgres_changes.map(
              (change, index) => ({ ...change, id: index + 1 }),
            );
            socket.send(
              JSON.stringify({
                topic: packet.topic,
                event: 'phx_reply',
                ref: packet.ref,
                payload: {
                  status: 'ok',
                  response: { postgres_changes: socket.changes },
                },
              }),
            );
          }
          if (packet.event === 'heartbeat')
            socket.send(
              JSON.stringify({
                topic: 'phoenix',
                event: 'phx_reply',
                ref: packet.ref,
                payload: { status: 'ok', response: {} },
              }),
            );
        });
      };
      await page.routeWebSocket(/realtime/, handleSocket);
      const baseUrl = process.env.BANKO_BROWSER_URL || 'http://localhost:3331';
      await page.goto(baseUrl + '/create');
      await page.getByLabel('Room name', { exact: true }).fill('Test table');
      await page
        .getByLabel('What should we call you?')
        .fill('A very long player name for narrow phones');
      await page.getByRole('radio', { name: 'Yellow', exact: true }).check();
      assert.match(
        await page.locator('.bank-card').innerText(),
        /A very long player name/,
      );
      await page.locator('summary').click();
      assert.equal(await page.getByLabel('Pass Go salary').inputValue(), '200');
      assert.equal(await page.getByLabel('Dice sides').inputValue(), '12');
      await page.getByLabel('Starting balance').fill('999999999999.99');
      await page.locator('summary').click();
      assert.equal(
        await page.evaluate(() =>
          new FormData(document.querySelector('form')).get('salaryAmount'),
        ),
        '200',
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.goto(baseUrl + '/join?code=ABC123');
      assert.equal(
        await page.getByLabel('Room code', { exact: true }).inputValue(),
        'ABC123',
      );
      await page.waitForTimeout(500);
      assert.equal(
        await page
          .getByRole('radio', { name: 'Red Taken', exact: true })
          .isDisabled(),
        true,
      );
      await page.goto(baseUrl + '/ui-review?view=lobby');
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error('Denied');
            },
          },
        }),
      );
      await page
        .getByRole('button', { name: 'Copy code', exact: true })
        .click();
      await page.locator('.error-message, .copy-fallback').waitFor();
      assert.match(
        await page.getByLabel('Text to copy').inputValue(),
        /ABC123/,
      );
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async () => {} },
        }),
      );
      await page
        .getByRole('button', { name: 'Copy code', exact: true })
        .click();
      assert.equal(
        await page.getByRole('button', { name: 'Copied', exact: true }).count(),
        1,
      );
      await page.goto(baseUrl + '/ui-review');
      await page.getByRole('button', { name: 'Review', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Review', exact: true }).click();
      await page
        .getByRole('button', { name: 'Decline', exact: true })
        .waitFor();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await page.getByRole('button', { name: /Julio/ }).click();
      await page.getByLabel('Amount', { exact: true }).fill('200');
      await page
        .getByRole('button', { name: 'Send $200', exact: true })
        .click();
      await page.locator('.error-message, .copy-fallback').waitFor();
      assert.equal(
        await page.getByLabel('Amount', { exact: true }).inputValue(),
        '200',
      );
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'My QR', exact: true }).click();
      await page.getByLabel('Amount to request').fill('200');
      assert.equal(
        (await page.locator('svg[role="img"]').count()) +
          (await page.getByTitle('Scan to review payment').count()) >
          0,
        true,
      );
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        };
      });
      await page.getByRole('button', { name: 'Scan', exact: true }).click();
      await page
        .getByText('Camera permission denied. Allow access, then retry.', {
          exact: true,
        })
        .waitFor();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page
        .getByRole('button', { name: 'Close', exact: true })
        .press('Escape');
      await page.getByRole('tab', { name: 'Activity', exact: true }).click();
      assert.match(
        await page
          .locator('[data-slot="tabs-content"][data-state="active"]')
          .innerText(),
        /7/,
      );
      assert.match(
        await page
          .locator('[data-slot="tabs-content"][data-state="active"]')
          .innerText(),
        /request rejected/,
      );
      await page.getByRole('tab', { name: 'Bank', exact: true }).click();
      for (const title of [
        'Pay salary',
        'Bank transfers',
        'Shared pot',
        'Player status',
        'Loans & mortgages',
        'Transaction history',
      ]) {
        await page
          .getByRole('button', { name: new RegExp(title.replace('&', '&')) })
          .click();
        await page.getByRole('dialog').waitFor();
        await page.getByRole('button', { name: 'Close', exact: true }).click();
      }
      await page.getByRole('button', { name: 'End game', exact: true }).click();
      assert.equal(
        await page
          .getByRole('button', { name: 'End game and show standings' })
          .count(),
        1,
      );
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('tab', { name: 'Wallet', exact: true }).focus();
      await page
        .getByRole('tab', { name: 'Wallet', exact: true })
        .press('Enter');
      const rivalPage = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      await rivalPage.route('**/*', handleRequest);
      await rivalPage.routeWebSocket(/realtime/, handleSocket);
      await rivalPage.goto(baseUrl + '/ui-review?view=rival');
      await rivalPage.getByText('$400', { exact: true }).waitFor();
      currentRoom = { ...room, shared_pot_balance: 875 };
      currentPlayers = players.map((player) => ({
        ...player,
        status: player.id === 'player-1' ? 'defeated' : 'active',
      }));
      for (const socket of sockets) {
        if (socket.topic)
          socket.send(
            JSON.stringify({
              topic: socket.topic,
              event: 'postgres_changes',
              payload: {
                ids: socket.changes.map((change) => change.id),
                data: {
                  columns: [],
                  schema: 'public',
                  table: 'rooms',
                  type: 'UPDATE',
                  commit_timestamp: new Date().toISOString(),
                  record: currentRoom,
                  old_record: {},
                },
              },
            }),
          );
      }
      await page.getByText('$875', { exact: true }).waitFor({ timeout: 10000 });
      assert.equal(
        await page
          .getByRole('button', { name: 'Send', exact: true })
          .isDisabled(),
        true,
      );
      await rivalPage.getByText('$875', { exact: true }).waitFor();
      assert.equal(
        await rivalPage
          .getByRole('button', { name: 'Send', exact: true })
          .isEnabled(),
        true,
      );
      await rivalPage.close();
      currentRoom = { ...room };
      currentPlayers = players.map((player) => ({ ...player }));
      await page.goto(baseUrl + '/ui-review?view=pay');
      await page.getByRole('button', { name: 'Pay now' }).click();
      await page.locator('.error-message, .copy-fallback').waitFor();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      for (const viewport of [
        { width: 320, height: 568 }, { width: 360, height: 640 },
        { width: 390, height: 844 }, { width: 568, height: 320 },
        { width: 667, height: 375 }, { width: 768, height: 1024 },
        { width: 1366, height: 768 }, { width: 1902, height: 924 },
      ]) {
        await page.setViewportSize(viewport);
        for (const role of ['', '?view=rival']) {
          await page.goto(baseUrl + '/ui-review' + role);
          await page.getByText('Live', { exact: true }).waitFor();
          for (const tab of role ? ['Wallet', 'Players', 'Activity'] : ['Wallet', 'Players', 'Activity', 'Bank']) {
            await page.getByRole('tab', { name: tab, exact: true }).focus();
            await page.getByRole('tab', { name: tab, exact: true }).press('Enter');
            const overflow = await page.evaluate(() => ({
              horizontal: document.documentElement.scrollWidth > innerWidth,
              vertical: document.documentElement.scrollHeight > innerHeight,
            }));
            assert.deepEqual(overflow, { horizontal: false, vertical: false }, tab + JSON.stringify(viewport));
            if (tab === 'Wallet') {
              const outside = await page.locator('.wallet-actions button, .wallet-services button, [role="tab"]').evaluateAll(controls => controls.filter(control => {
                const bounds = control.getBoundingClientRect();
                return bounds.top < 0 || bounds.bottom > innerHeight || bounds.left < 0 || bounds.right > innerWidth;
              }).map(control => control.textContent));
              assert.deepEqual(outside, [], JSON.stringify(viewport));
              await page.screenshot({ path: '.next/room-' + viewport.width + '-' + viewport.height + (role ? '-player' : '-banker') + '.png' });
            }
          }
        }
      }
      currentRoom = { ...room, room_name: 'A very long room name '.repeat(4), bank_display_name: 'A very long bank name '.repeat(3) };
      currentPlayers = Array.from({ length: 24 }, (_, index) => ({ ...players[index % 2], id: index === 0 ? 'player-1' : 'guest-' + index, nickname: 'Long player name '.repeat(3) + index, current_balance: 999999999999, status: index === 0 ? 'defeated' : 'active' }));
      activityCount = 40;
      for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
        await page.setViewportSize(viewport);
        await page.goto(baseUrl + '/ui-review');
        await page.getByRole('heading', { name: currentRoom.room_name, exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Send', exact: true }).isDisabled(), true);
        const outside = await page.locator('.wallet-actions button, .wallet-services button').evaluateAll(controls => controls.some(control => control.getBoundingClientRect().bottom > innerHeight));
        assert.equal(outside, false, 'Defeated wallet ' + JSON.stringify(viewport));
        for (const tab of ['Players', 'Activity', 'Bank']) {
          await page.getByRole('tab', { name: tab, exact: true }).focus();
          await page.getByRole('tab', { name: tab, exact: true }).press('Enter');
          const panel = page.locator('[data-slot="tabs-content"][data-state="active"]');
          await panel.evaluate(element => { element.scrollTop = element.scrollHeight; });
          assert.equal(await page.evaluate(() => scrollY === 0 && document.documentElement.scrollHeight === innerHeight && document.documentElement.scrollWidth === innerWidth), true, tab + JSON.stringify(viewport));
          const lastControl = tab === 'Players' ? panel.locator('.player-row').last() : tab === 'Activity' ? panel.locator('.activity-row').last() : panel.getByRole('button', { name: 'End game', exact: true });
          assert.equal(await lastControl.evaluate(element => element.getBoundingClientRect().bottom <= innerHeight), true);
        }
      }
      currentRoom = { ...room };
      currentPlayers = players.map(player => ({ ...player }));
      activityCount = 1;
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const [name, path] of [
          ['home', '/'],
          ['create', '/create'],
          ['join', '/join?code=ABC123'],
          ['lobby', '/ui-review?view=lobby'],
          ['wallet', '/ui-review'],
          ['pay', '/ui-review?view=pay'],
          ['finish', '/ui-review?view=finish'],
        ]) {
          await page.goto(baseUrl + path);
          await page.waitForTimeout(150);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            name + ' overflows at ' + width,
          );
          await page.screenshot({
            path: '.next/ui-' + name + '-' + width + '.png',
            fullPage: true,
          });
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await unlink(new URL('page.tsx', fixtureDirectory));
      await rmdir(fixtureDirectory);
    }
  },
);
