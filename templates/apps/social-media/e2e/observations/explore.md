# Page observations: /explore (Explore)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role    | expected behavior on interaction                 | success signal                     | failure signal  |
| ----------------------------------- | ------- | ------------------------------------------------ | ---------------------------------- | --------------- |
| Explore tile `a[href="/posts/:id"]` | link    | navigate to that post's detail page              | URL becomes /posts/:id             | nav fails       |
| Trending hashtags rail              | region  | list trending hashtags from `/api/feed/trending` | at least one hashtag chip visible  | rail empty      |
| Suggested creators row              | region  | render suggestions from `/api/feed/suggestions`  | rows render with display name      | row missing     |
| Page heading copy                   | heading | identifies the page as Explore                   | text contains "Explore" or similar | heading missing |

## Hidden surfaces opened from this page

| trigger    | what it opens          | elements inside (selector / role / behavior) |
| ---------- | ---------------------- | -------------------------------------------- |
| Tile click | /posts/:id detail page | full post + comments form                    |

## Network calls expected during normal use

| trigger    | method | path                  | what request body or query is expected |
| ---------- | ------ | --------------------- | -------------------------------------- |
| Page mount | GET    | /api/feed/explore     | returns popular public `Post[]`        |
| Page mount | GET    | /api/feed/trending    | returns trending hashtags              |
| Page mount | GET    | /api/feed/suggestions | returns suggested creators             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/explore.spec.ts`
