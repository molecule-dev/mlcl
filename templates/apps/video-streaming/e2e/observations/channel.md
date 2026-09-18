# Page observations: /channel/:id (Channel)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/channel/<seeded-id>.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role                      | expected behavior on interaction                      | success signal                              | failure signal                         |
| --------------------------------------- | ------------------------- | ----------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| `getByRole('heading').first()`          | heading                   | shows the channel display name from /api/channels/:id | text matches seeded channel                 | placeholder name                       |
| `getByRole('button', { name: /subscribe | unsubscribe/i }).first()` | button                                                | toggles a /api/follows row for this channel | label flips, GET /api/follows confirms | label stuck, no DB row |
| `locator('a[href*="/watch/"]')`         | link                      | each video card opens /watch/:id                      | URL becomes /watch/:id of seeded id         | stays on /channel/:id                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| Mount   | GET    | /api/channels/:id          | channel record                         |
| Mount   | GET    | /api/videos?channel_id=:id | array of channel videos                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-channel.spec.ts`
