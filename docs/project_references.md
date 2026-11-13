# Project references

Catalog of verified professional projects, engines and open-source implementations used as technical references for this project.

## Workflow

1. Check the catalog below before implementing a new feature, patch or fix.
2. When a listed reference matches the task domain, study its implementation and cross-check another source when design trade-offs warrant comparison.
3. When no listed reference fits the current task adequately, fall back to searching for established professional implementations.
4. Record each useful verified reference here immediately so future lookups are faster.
5. Keep this catalog multi-source: relying on only one reference project for everything is a bad approach, and each entry should match a concrete domain or mechanism.

## Recording rules

Add rows only for references you actually inspected and verified. Include the problem area, project name, exact link or repository path, specific mechanism worth following and any limits or differences relative to this project.

## Catalog

| Area | Project | Source | Mechanism referenced | Notes and differences |
| ---- | ------- | ------ | -------------------- | --------------------- |

| Banking hierarchy | Monzo | https://monzo.com/blog/how-we-built-the-new-home-screen | Keep balances, copying details and transactions discoverable | Product research, adapted to game money |
| Unified activity | Monzo | https://monzo.com/blog/how-we-unified-our-customers-activity-on-the-new-home-screen | Chronological transactions and game events | Local feed, no server-driven UI architecture |
| Color identity | Wise | https://wise.com/community/en-US/brand-new-look | Bold green identity with clean composition | Banko uses lime on dark surfaces |
| Payments | Revolut | https://www.revolut.com/blog/post/how-to-send-money-on-revolut/ | Recipient and amount clarity before sending | No real banking integrations |
| UI primitives | shadcn | https://ui.shadcn.com/docs/tailwind-v4 | React 19 and Tailwind 4 component ownership | Radix Nova preset |
| Motion accessibility | Animate UI | https://animate-ui.com/docs/accessibility | Reduced motion and retained primitive semantics | Sheets and dropdowns only |
| App icons | Next.js | https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons | File conventions wire SVG, ICO and Apple touch icons into metadata | SVG is canonical; raster exports come from scripts/generate-icons.mjs |
