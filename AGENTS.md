# AGENTS.md

Instructions for AI coding agents working in this repository. These rules apply
regardless of stack or language unless a more specific project doc overrides
them. If something here conflicts with an explicit user instruction in the
current conversation, the user instruction wins.

Stack-specific rules that build on top of this file live in
[.agents/](./.agents/), one subfolder per stack, e.g.
[.agents/godot/](./.agents/godot/) and [.agents/node/](./.agents/node/). Each
subfolder pairs an `AGENTS.md` expansion with a generic `.gitignore` for that
stack. Read the expansion matching this project's stack alongside this file.
Expansions add to these rules, they do not replace them.

## Required skills

Both of these apply to every task in this repository, always. Invoke them by
name rather than approximating their behavior from memory.

- **`ponytail`**: invoke on any coding task (writing, adding, refactoring,
  fixing, reviewing, designing code, choosing a library or dependency) before
  proposing or writing code. It forces the laziest solution that actually
  works: standard library before custom code, native platform features before
  dependencies, one line before fifty.
- **`caveman`**: invoke at the start of the session and keep every prose
  response in that mode. Technical substance stays exact, only fluff is cut.
  Scope is chat responses. Commit messages, documentation, code comments and
  code itself stay in normal English, because they are read by people who
  never opted into this setup.

Where `ponytail`'s YAGNI instinct conflicts with prime directive 2, prime
directive 2 wins: raise the simplification, don't silently drop requested
work.

If a skill is unavailable in the current environment, say so once and apply
its principle manually instead of skipping it.

## Prime directives

1. **Never assume — ask when genuinely blocked.** If a requirement, expected
   behavior, or root cause isn't clear from the code, docs, or conversation,
   stop and ask rather than guessing. A wrong guess costs more than a
   question. This does not apply to small, mechanically obvious choices
   (variable names, which existing helper to call) — resolve those yourself
   and, if you made a judgment call worth knowing about, say so in your
   summary rather than asking permission for it.
2. **Stay inside the requested scope.** Do the task asked. If you notice an
   unrelated bug, improvement, or cleanup opportunity, mention it — don't
   fix it unless asked. Don't narrow or widen scope silently.
3. **Read before you edit.** Understand the surrounding code and match its
   existing conventions (naming, formatting, patterns) before changing it.
   Don't reformat or restyle lines you weren't asked to touch.
4. **Reuse before adding.** Prefer an existing utility, pattern, or dependency
   already in the codebase over introducing a new one. Adding a new
   dependency is a decision with a cost (bundle size, security surface,
   maintenance) — justify it, don't default to it.
5. **Report faithfully.** Never describe an outcome you didn't actually
   observe. If you couldn't run or test something, say so explicitly instead
   of implying it works. "Should work" and "verified working" are different
   claims — use the right one.
6. **Investigate professional references before implementing.** Before
   implementing any new feature, patch or fix, inspect how established
   professional projects solve the same problem. Implementing without a
   professional reference is improvising, and improvising is a bad approach.
   Check [docs/project_references.md](./docs/project_references.md) first. If
   a listed reference fits the current task, use it and cross-check others
   when warranted. If no listed reference fits adequately, fall back to
   looking up new professional references and document useful findings in
   [docs/project_references.md](./docs/project_references.md) so future work
   is faster. Using only one reference for everything is a bad approach:
   match references to the specific domain rather than forcing one listed
   project onto every task.

## Code quality

- **No speculative abstraction.** Solve the problem in front of you. Don't
  build configurability, extensibility, or generality for hypothetical future
  needs. Three similar lines beat a premature abstraction; if a fourth
  near-duplicate shows up, that's the signal to factor it out.
- **No dead code.** Delete code that's no longer used instead of commenting
  it out or leaving it behind a disabled flag. Version control is the
  archive, not the working tree.
- **Code is the primary documentation.** Names, types and structure carry the
  explanation. A comment is a fallback for what the code genuinely cannot
  express, so when one feels necessary, first check whether a better name or
  a smaller function removes the need for it.
- **Comment the why, not the what.** Well-named code already explains what
  it does. Only add a comment when it captures something the code can't:
  a non-obvious constraint, a workaround for a specific bug, a reason a
  simpler approach won't work. Skip comments that just restate the next
  line.
- **Keep doc comments to two lines.** JSDoc blocks and comments stay concise
  and brief. Prose running past two lines means the description is doing work
  the code should be doing: rename, split or simplify until it fits. JSDoc
  tag lines (`@param`, `@returns`, `@throws` and similar) sit outside that
  count, they define the contract and are required to describe it correctly.
- **File size as a design signal.** When a file grows very large (roughly
  800–1000 lines, depending on language norms), treat it as a prompt to
  look for a natural seam to split along — not a hard rule to game with
  arbitrary cuts. Confirm the split point makes sense before doing a large
  mechanical reorganization; don't drive-by-split files unrelated to the
  task.
- **Validate at boundaries only.** Trust internal function contracts and
  framework guarantees. Add validation and error handling where untrusted
  input actually enters the system (user input, external APIs, file/network
  I/O) — not defensively everywhere.
- **Don't hand-edit generated or tool-owned files.** Lockfiles, build
  output, generated bindings, and files a specific tool/command owns should
  be changed by re-running that tool, not by direct edits. If a file has a
  "generated, do not edit" header, respect it.
- **Naming conventions.** Follow whatever casing/naming convention the
  language and existing codebase already use consistently. If none exists
  yet, pick the idiomatic convention for that language and apply it
  consistently rather than mixing styles.
- **Abbreviated identifiers are forbidden.** This is a hard rule and it
  applies to every identifier in the code: variables, parameters, functions,
  types, fields, files. Never truncate or mangle a word. Write `userProfile`
  not `user_p`, `button` not `btn`, `index` not `idx`, `configuration` not
  `cfg`, `request` not `req`, `temporary` not `tmp`. Established acronyms are
  words rather than truncations, so `mcp`, `smtp`, `aws`, `http`, `url`, `id`
  and `json` are correct as they are.
- **Name the real abstraction, never a placeholder.** A binding takes the
  domain name of what it actually holds. Write `products.map(product => ...)`
  not `products.map(item => ...)`. `item`, `el`, `obj`, `val`, `data`,
  `thing` and bare single letters describe nothing and are forbidden for
  domain values. A numeric loop counter (`i`) is the one exception, since it
  holds an index rather than a domain object.

## Security

- Never commit secrets, API keys, tokens, or credentials. `.env` and similar
  files stay gitignored; commit a `.env.example` with placeholder values
  instead.
- Treat all external input (user input, network responses, file contents) as
  untrusted. Guard against injection classes relevant to the stack (SQL,
  command, XSS, path traversal, etc.) at the point where that input is used.
- If you notice you've written something insecure, fix it immediately rather
  than leaving it for later.
- Don't weaken security controls (auth checks, permission gates, TLS
  verification, CSP, etc.) to make something "just work" — flag the
  conflict instead.

## Testing

- Don't add tests reflexively for every change. Add a test when:
  - You fixed a bug — write a regression test that fails before the fix and
    passes after. Name it after the bug scenario, not the fix
    (`does_not_double_charge_on_retry`, not `test_fix`).
  - You implemented new logic from scratch that has no existing coverage.
  - The user explicitly asks for tests.
- Don't proactively run the full test suite, linter, or formatter across the
  whole repo "just to be safe" unless asked or unless it's part of the
  project's own pre-commit/CI gate. Run the tests relevant to what you
  changed.
- Don't test framework internals, third-party libraries, or trivial
  getters/setters — test behavior that could plausibly break.

## Git & version control

- **Commit and push only when explicitly asked.** Making local edits doesn't
  imply the user wants them committed, and committing doesn't imply they
  want it pushed.
- **One logical change per commit.** Use
  [Conventional Commits](https://www.conventionalcommits.org/) style
  (`type(scope): subject`) where the project doesn't already dictate
  otherwise: lowercase subject, no trailing period, keep the subject line
  short (~72 chars), blank line before any body.
- **Never bypass hooks or checks** (`--no-verify`, disabling a linter rule
  inline, skipping CI) to get past a failure — fix the underlying issue
  instead. If a hook seems wrong, say so and ask rather than routing around
  it silently.
- **Never force-push or push to the default/main branch** without explicit
  confirmation for that specific action.
- Before any destructive git operation (`reset --hard`, `checkout --`,
  `clean -f`, discarding a branch), check `git status` first and make sure
  nothing valuable is about to be lost.
- Investigate unfamiliar existing state (stray branches, uncommitted changes,
  unusual files) before overwriting or deleting it — it may be someone's
  in-progress work.

## Configuration & tooling

- Config files owned by a specific tool (formatter configs, IDE settings,
  auto-generated manifests) should be changed through that tool's own
  workflow when one exists, not hand-edited around it.
- Prefer scripts/tasks the project already defines (`package.json` scripts,
  `Makefile` targets, etc.) over ad hoc equivalent commands.
- If a hook or check depends on a tool that isn't installed yet (fresh
  clone, no `install` step run), it should degrade gracefully — skip with a
  warning rather than hard-failing — so the repo stays usable before setup
  is complete.

## Communication style

- Keep responses concise and relevant. Lead with the answer or result, not a
  restatement of the request.
- State assumptions and judgment calls explicitly rather than burying them.
- When something didn't work, say what failed and why — don't soften it into
  vague language.
- Avoid filler, hedging, and unnecessary preamble ("I'll now proceed to...").
- **Never use em dashes.** Don't use an em dash (—) or an en dash (–) as
  punctuation in prose, code comments, commit messages, or documentation.
  Rewrite the sentence, or use a comma, colon, parenthesis or period
  instead.
- **Never use the Oxford comma.** In a list of three or more items, write
  "a, b and c" rather than "a, b, and c".
- **Never use litotes.** Don't state something by negating its opposite.
  Write "common" not "not uncommon", "works" not "not broken", "a hard
  problem" not "no small problem". Say the thing directly, including when
  the direct version is blunter.
- **Never use bullet or middle dot characters.** Don't use the bullet character
  (•) or middle-dot / interpunct character (·) anywhere across text, copy,
  metadata, labels or code.

## Definition of done

Before considering a task complete, check that:

- [ ] The actual request was fulfilled — not a broader or narrower version of it.
- [ ] Existing conventions (style, structure, naming) were matched, not overridden.
- [ ] No dead code, debug prints, or commented-out blocks were left behind.
- [ ] No secrets, credentials, or sensitive data were introduced.
- [ ] Tests were added only where warranted (see Testing) and pass.
- [ ] Anything unverified or assumed is called out explicitly in the summary.
- [ ] Nothing was committed or pushed unless explicitly requested.
