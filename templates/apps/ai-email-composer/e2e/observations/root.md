# Page observations: / (Landing)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/root.html`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                     | role    | expected behavior on interaction           | success signal        | failure signal |
| ---------------------------------------------------------------------------------------------- | ------- | ------------------------------------------ | --------------------- | -------------- |
| `getByRole("heading", { level: 1 })`                                                           | heading | the hero heading is visible above the fold | element visible       | absent         |
| `getByRole("link", { name: /sign in/i }).first()`                                              | link    | navigates to `/login`                      | URL becomes `/login`  | stays on `/`   |
| `getByRole("link", { name: /try signet free\|start writing\|sign up\|get started/i }).first()` | link    | navigates to `/signup`                     | URL becomes `/signup` | stays on `/`   |

## Hidden surfaces opened from this page

| trigger                                            | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — landing is a single-screen marketing page) | —             | —                                            |

## Network calls expected during normal use

<!-- Public marketing page; no API calls during normal browsing. -->

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
