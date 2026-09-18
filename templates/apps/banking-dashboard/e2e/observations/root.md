# Page observations: / (Landing)

Source: live walk via Playwright + e2e/root.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                       | role    | expected behavior on interaction                                | success signal                          | failure signal            |
| ------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------- | --------------------------------------- | ------------------------- |
| `getByRole('navigation')` brand text                                                             | heading | nav bar renders the app name and Sign in / Open an account CTAs | visible at top of page                  | header missing            |
| `getByRole('link', { name: /sign in/i }).first()`                                                | link    | navigates to /login                                             | URL becomes /login, email field visible | URL unchanged             |
| `getByRole('link', { name: /open an account/i }).first()`                                        | link    | navigates to /signup                                            | URL becomes /signup, name field visible | URL unchanged             |
| Hero `<h1>`                                                                                      | heading | landing tagline renders (no Lorem ipsum / placeholder)          | h1 visible with non-stub copy           | placeholder text or empty |
| Sample balance card "Total Balance $48,290.50"                                                   | text    | hero card on right shows mock balance + sparkline               | visible + currency-formatted            | card missing              |
| Feature grid (Multi-account view, Transparent transfers, Clean statements, Audit-grade security) | section | 4 feature cards render with icons + descriptions                | all 4 visible                           | fewer than 4              |
| Bottom CTA `Open your account in minutes` link                                                   | link    | clicking the secondary CTA also lands on /signup                | URL becomes /signup                     | URL unchanged             |
| Footer copyright line "Member FDIC"                                                              | text    | footer renders the brand + member-FDIC string                   | visible at bottom                       | footer missing            |

## Hidden surfaces opened from this page

| trigger                                 | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------- | ------------- | -------------------------------------------- |
| (none — single landing page, no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger                                                  | method | path | what request body or query is expected |
| -------------------------------------------------------- | ------ | ---- | -------------------------------------- |
| (none — fully static; no /api calls fire on first paint) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
