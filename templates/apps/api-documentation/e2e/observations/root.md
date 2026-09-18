# Page observations: / (Landing)

Source: live walk via Playwright + e2e/root.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal      | failure signal   |
| --------------------------------------------------- | ------- | -------------------------------- | ------------------- | ---------------- |
| `getByRole("link", { name: /Try free/i }).first()`  | link    | navigates to /signup             | URL becomes /signup | navigation fails |
| `getByRole("link", { name: /^Sign in$/i }).first()` | link    | navigates to /login              | URL becomes /login  | navigation fails |
| `getByRole("heading", { level: 1 })`                | heading | hero heading is visible          | heading visible     | heading missing  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                    | method | path | what request body or query is expected |
| -------------------------- | ------ | ---- | -------------------------------------- |
| (none — fully static page) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
