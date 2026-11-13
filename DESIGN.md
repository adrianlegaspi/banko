# Banko design system

## Scene

Friends glancing at phones around a game table in evening light. Dark cool surfaces reduce glare; vivid cards make player identity easy to recognize.

## Color

Semantic OKLCH tokens live in app/globals.css. Electric lime marks primary actions. Muted surfaces and borders carry secondary structure. Success and destructive colors communicate status. Player palettes live in lib/player-colors.ts and preserve persisted color keys. Each palette has an explicit contrasting foreground.

## Typography and spacing

System sans throughout. Tabular currency numerals. Strong heading weight and deliberate spacing distinguish sections. Primary controls are 48px tall; interactive targets are at least 44px.

## Components

Banko's app mark is a bold geometric B on a lime tile. A tilted one-pip die replaces the upper counter, adding game-night character while the open lower counter preserves the letter's silhouette. The canonical asset is app/icon.svg, shared by the header and browser metadata. Run node scripts/generate-icons.mjs to refresh the ICO and Apple touch icon after editing the SVG.

Edit only app/icon.svg. Both pnpm dev and pnpm build regenerate derived icons automatically. Use pnpm icons to refresh exports directly.

shadcn Radix components provide buttons, inputs, tabs and menus. Animate UI powers sheets and dropdowns. Bank card retains circles, card-holder identity and prominent balance. Avoid wrapping every row in another panel.

## Responsive behavior

Mobile setup stacks card preview and fields. Desktop setup and wallet use two columns. Room fills the dynamic viewport with a compact header and no footer. Game navigation occupies the bottom layout row on mobile and sits above content on desktop. Lists scroll inside tab panels. Phone Wallet keeps history in the Activity tab; short landscape screens place the card beside wallet controls. Sheets scroll independently and account for narrow screens.

## Motion

Motion communicates opening and state changes. Respect operating-system reduced motion. No decorative loops or page-load choreography.
