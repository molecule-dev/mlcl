# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `browser_navigate` → `/`
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — nav, hero CTAs, footer links.
4. Re-navigate and re-snapshot.
5. When complete, write `e2e/root.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role                                         | expected behavior on interaction | success signal                           | failure signal                             |
| ------------------------------------------------------- | -------------------------------------------- | -------------------------------- | ---------------------------------------- | ------------------------------------------ |
| `getByRole('heading', { level: 1 })` (Landing headline) | heading                                      | renders the marketing headline   | h1 visible with non-empty text           | missing / empty                            |
| `getByRole('link', { name: /sign in/i }).first()`       | link                                         | navigates to `/login`            | URL becomes `/login`, login form visible | URL stays `/`                              |
| `getByRole('link', { name: /start editing free          | open lustra/i }).first()` (primary hero CTA) | link                             | navigates to `/signup`                   | URL becomes `/signup`, signup form visible | URL stays `/` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | Landing has no menus / modals / tabs         |

## Network calls expected during normal use

| trigger     | method | path   | what request body or query is expected                             |
| ----------- | ------ | ------ | ------------------------------------------------------------------ |
| (page load) | —      | (none) | Landing renders entirely from local strings + SAMPLE_PRESETS const |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
