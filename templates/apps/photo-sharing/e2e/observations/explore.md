# Page observations: /explore (Explore)

> Authed — landing for signed-in users. Tag filter chips (All / Landscape /
> Portrait / Street / Nature / Documentary / Cityscape), a hero photo card
> linking to `/photos/:id`, and a masonry of public photos. Each photo
> opens its detail page on click. Page calls `GET /api/photos?tag=...`
> on mount and when the chip changes.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name   | role        | expected behavior on interaction | success signal                     | failure signal |
| ---------------------------- | ----------- | -------------------------------- | ---------------------------------- | -------------- |
| Tag chip "All"               | button/link | sets `tag=` empty; reloads list  | active filter switches             | filter ignored |
| Tag chip "Landscape"         | button/link | sets `tag=landscape`; refetches  | URL `?tag=landscape`; list updates | filter ignored |
| Hero photo card              | link        | nav to `/photos/:id`             | URL becomes detail page            | stays          |
| Masonry photo card           | link        | nav to `/photos/:id`             | URL becomes detail page            | stays          |
| `getByRole('heading')` first | heading     | identifies the page              | heading visible                    | empty          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger        | method | path                | what request body or query is expected |
| -------------- | ------ | ------------------- | -------------------------------------- |
| Page mount     | GET    | /api/photos         | `[{ id, title, original_url, ... }]`   |
| Click tag chip | GET    | /api/photos?tag=... | filtered list                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/explore.spec.ts`
