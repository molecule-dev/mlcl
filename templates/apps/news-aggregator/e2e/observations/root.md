# Page observations: / (Landing)

> Observed via Playwright at http://localhost:3080/ — public marketing
> page rendered by `pages/Landing.tsx`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction | success signal      | failure signal |
| ------------------------------------------------------------ | ------- | -------------------------------- | ------------------- | -------------- |
| `getByRole('heading', { name: /every angle, one view/i })`   | heading | renders the hero headline        | visible             | missing        |
| `getByRole('link', { name: /start reading free/i }).first()` | link    | navigates to /signup             | URL becomes /signup | unchanged      |
| `getByRole('link', { name: /sign in/i }).first()` (top nav)  | link    | navigates to /login              | URL becomes /login  | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger                                | method | path | what request body or query is expected |
| -------------------------------------- | ------ | ---- | -------------------------------------- |
| (none — fully static marketing render) | —      | —    | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
