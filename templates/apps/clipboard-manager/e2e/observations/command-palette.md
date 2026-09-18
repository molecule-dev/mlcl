# Page observations: /command-palette (CommandPalette)

Source: live walk via Playwright + e2e/command-palette.spec.ts.
Static demo + shortcut reference. Renders a CommandPaletteCard
mockup with five seeded results and an editable query input that
round-trips into local state. Below it sits a 8-row shortcut table.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name | role    | expected behavior on interaction                                                      | success signal           | failure signal |
| -------------------------- | ------- | ------------------------------------------------------------------------------------- | ------------------------ | -------------- |
| Heading + ⌘K hint          | heading | renders page title + "try it on a real keyboard" subhead                              | both visible             | missing        |
| Demo `input[type=search]`  | textbox | round-trips query state into local React state                                        | typed text persists      | not editable   |
| Shortcut table — 8 rows    | table   | static reference (Open palette, Navigate, Paste, Pin, Encrypt, Delete, Filter, Close) | all eight labels visible | any missing    |

## Hidden surfaces opened from this page

| trigger                                        | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------------- | ------------- | -------------------------------------------- |
| (none — single static help page)               | —             | —                                            |
| (no modals, no popovers, no off-screen panels) | —             | —                                            |

## Network calls expected during normal use

(no API calls — static demo + help reference)

## Coverage check (final pass)

- [x] Heading + hint observed
- [x] Demo query input round-trip tested
- [x] All eight shortcut rows verified
- [x] All elements above have a corresponding test in `e2e/command-palette.spec.ts`
