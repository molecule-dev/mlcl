# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright. Source of
> truth for the rendered state of `/` after `browser_navigate`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role                      | expected behavior on interaction | success signal       | failure signal      |
| ------------------------------------- | ------------------------- | -------------------------------- | -------------------- | ------------------- |
| `getByRole('heading')` first          | heading                   | visible above the fold           | rendered             | missing             |
| `getByRole('link', { name: /sign\s*in | log\s*in/i })` first      | link                             | navigates to /login  | URL becomes /login  | no nav |
| `getByRole('link', { name: /sign\s*up | get\s*started/i })` first | link                             | navigates to /signup | URL becomes /signup | no nav |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                                                  | method | path | what request body or query is expected |
| -------------------------------------------------------- | ------ | ---- | -------------------------------------- |
| (none — the public marketing page does not hit `/api/*`) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
