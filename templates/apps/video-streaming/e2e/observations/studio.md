# Page observations: /studio (Creator Studio)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/studio.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                         | role    | expected behavior on interaction      | success signal      | failure signal  |
| ---------------------------------------------------------------------------------- | ------- | ------------------------------------- | ------------------- | --------------- |
| `getByRole('heading').first()`                                                     | heading | shows the Studio dashboard headline   | heading visible     | header missing  |
| `getByRole('link', { name: /upload/i }), getByRole('button', { name: /upload/i })` | link    | the studio's upload CTA opens /upload | URL becomes /upload | nothing happens |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected  |
| ------- | ------ | ------------------ | --------------------------------------- |
| Mount   | GET    | /api/studio/stats  | aggregate stats for the current creator |
| Mount   | GET    | /api/studio/videos | the creator's owned videos              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-studio.spec.ts`
