# Page observations: /subscriptions (Subscriptions)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/subscriptions.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name        | role    | expected behavior on interaction    | success signal           | failure signal   |
| --------------------------------- | ------- | ----------------------------------- | ------------------------ | ---------------- |
| `getByRole('heading').first()`    | heading | shows the Subscriptions headline    | text rendered            | placeholder copy |
| `locator('a[href*="/channel/"]')` | link    | each channel row opens /channel/:id | URL becomes /channel/:id | no navigation    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected    |
| ------- | ------ | -------------------------- | ----------------------------------------- |
| Mount   | GET    | /api/follows               | rows of channels the current user follows |
| Mount   | GET    | /api/videos?channel_id=... | per-channel video previews                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-subscriptions.spec.ts`
