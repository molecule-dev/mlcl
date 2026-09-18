# Page observations: /projects/:id/mix (Mixing)

> Filled from a Playwright MCP walk of the live app. Auth-required.
> Requires a project with at least one track for the mixer to render strips.

## Page state assumed

- [x] Authenticated (sign up, then create project + tracks via API)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                                                   | success signal                             | failure signal    |
| ------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------- | ------------------------------------------ | ----------------- |
| `getByRole('link', { name: /^Arrangement$/i })`                    | link    | back to `/projects/:id` (top-left)                                                 | URL = `/projects/<id>`                     | stays on mixer    |
| `getByRole('heading', { name: /^Mixer$/ })`                        | heading | page h1                                                                            | visible                                    | missing           |
| tracks count chip                                                  | text    | "{{count}} tracks" badge in header                                                 | shows actual count                         | wrong count       |
| empty-state                                                        | text    | "No tracks yet — add a track in the arrangement view first." when no tracks        | visible                                    | missing           |
| empty-state cta `getByRole('link', { name: /open arrangement/i })` | link    | when no tracks, link → `/projects/:id`                                             | URL = `/projects/<id>`                     | broken            |
| `input[aria-label*="Volume"]` (per channel)                        | slider  | range slider 0..1; PUT `/api/tracks/:id` with `{ volume }`; persists across reload | reload returns same volume                 | volume reverts    |
| `input[aria-label*="Pan"]` (per channel)                           | slider  | range slider -1..1; PUT `/api/tracks/:id` with `{ pan }`; persists                 | reload returns same pan                    | reverts           |
| `button[aria-label^="Mute"]`                                       | button  | toggles mute, PUT `/api/tracks/:id` with `{ muted }`; aria-pressed reflects state  | aria-pressed flips, persists across reload | doesn't persist   |
| `button[aria-label^="Solo"]`                                       | button  | toggles solo, PUT `/api/tracks/:id` with `{ solo }`; aria-pressed flips            | aria-pressed flips, persists               | doesn't persist   |
| meter visualization                                                | n/a     | colored bar reflects current `level` value                                         | bar visible                                | hidden / always 0 |

## Hidden surfaces opened from this page

| trigger | what it opens                                   | elements inside (selector / role / behavior) |
| ------- | ----------------------------------------------- | -------------------------------------------- |
| (none)  | mixer is one screen of channel strips; no menus | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path              | what request body or query is expected |
| ------------ | ------ | ----------------- | -------------------------------------- |
| initial load | GET    | `/api/tracks`     | `?project_id=<id>`                     |
| volume drag  | PUT    | `/api/tracks/:id` | `{ volume: <0..1> }`                   |
| pan drag     | PUT    | `/api/tracks/:id` | `{ pan: <-1..1> }`                     |
| mute toggle  | PUT    | `/api/tracks/:id` | `{ muted: bool }`                      |
| solo toggle  | PUT    | `/api/tracks/:id` | `{ solo: bool }`                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id_mix.spec.ts`
