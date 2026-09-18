# Page observations: /share/:token (SharePreview)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate`.

## Page state assumed

- [x] Public (no auth required) — token comes from URL path

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction        | success signal                         | failure signal  |
| ---------------------------------------------------------------- | ------- | --------------------------------------- | -------------------------------------- | --------------- |
| `getByRole('heading', { name: /Animation preview/i, level: 1 })` | heading | render share-preview title              | visible                                | absent          |
| `getByRole('link', { name: /Try Vivace free/i })`                | link    | navigate to /signup                     | URL becomes /signup                    | stays           |
| `getByRole('button', { name: /Play preview/i })`                 | button  | toggle local play state in mock preview | aria-label or label flips to /Pause/   | label unchanged |
| `getByRole('button', { name: /Toggle playback/i })`              | button  | toggle local playback in transport bar  | label flips between play_arrow / pause | unchanged       |
| `getByRole('link', { name: /Sign in to comment/i })`             | link    | navigate to /signup                     | URL becomes /signup                    | stays           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                    | method | path          | what request body or query is expected         |
| -------------------------- | ------ | ------------- | ---------------------------------------------- |
| page load (signed in only) | GET    | /api/projects | (none — used to populate "Related animations") |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/share__token.spec.ts`
