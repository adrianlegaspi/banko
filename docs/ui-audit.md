# UI redesign audit

## Implemented direction

Phone-first dark fintech interface, electric lime actions, colorful player cards, shadcn Radix primitives, Lucide icons and selective Animate UI. Setup uses a live card preview and optional rules. Lobby sharing provides copy feedback and invitation links. Wallet and banker controls use separate tabs. QR scanning opens payment review.

## Deferred backend findings

- Privileged server actions use the admin client without caller or operator authorization checks. UI role gating is not authorization.
- Request acceptance updates status before the transaction succeeds. Failed payment can leave accepted status. This needs an atomic backend operation.
- Stored dice setting defaults to 12 while the game rolls two six-sided dice. Gameplay behavior remains unchanged.
- Digital board component exists but is not mounted by current routes. It was left unchanged.

## Verification

Run focused regression checks with node --test tests/*.test.mjs. Browser checks use Playwright with intercepted browser requests and development-only fixtures; no production transactions are required.

## Running browser regression checks

Start the development server with pnpm dev. In PowerShell, set $env:BANKO_BROWSER_TESTS='1', then run node --test tests/ui.test.mjs. Install Chromium first with pnpm exec playwright install chromium. The opt-in browser test creates a temporary ui-review route, intercepts database and mutation requests and removes the route in cleanup. Screenshots are saved under .next/ui-*.png.

Verified checks include copy fallback/success, invitation prefill, taken colors, transfer failure retaining input, QR generation, banker dialogs, request history, dice totals and mocked realtime pot/defeat updates. Live backend transactions and physical-camera scanning require a separate development-room smoke test.

The browser regression also covers camera denial, reduced-motion navigation, final standings and two isolated mocked player sessions receiving the same pot/status updates.
