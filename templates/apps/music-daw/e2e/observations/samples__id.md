# Page observations: /samples/:id (SampleDetail)

> Filled from a Playwright MCP walk of the live app. Auth-required.
> Tested against a seeded library sample (read-only) and an
> owner-created sample (editable).

## Page state assumed

- [x] Authenticated (sign up first, navigate via the library row)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                        | success signal                        | failure signal   |
| ----------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| `getByRole('link', { name: /^Library$/ })`            | link    | back to `/samples` (top-left)                                           | URL = `/samples`                      | stays            |
| `<h1>` sample name                                    | heading | shows the sample's `name`                                               | visible, matches API                  | wrong/empty      |
| pack eyebrow                                          | text    | uppercase pack name                                                     | matches `pack` field                  | missing          |
| meta strip (BPM/key/duration/loop)                    | text    | "{{bpm}} BPM · {{key}} · {{seconds}}s · Loop"                           | numbers match GET                     | wrong values     |
| `getByRole('button', { name: /preview sample/i })`    | button  | toggles `aria-pressed`; flips `play_arrow` ↔ `pause` icon               | aria-pressed flips                    | unchanged        |
| `getByRole('button', { name: /loop/i })` (own sample) | button  | PUT `/api/samples/:id` `{ is_loop: !current }`; persists across reload  | reload returns updated `is_loop`      | reverts          |
| download `<a href={url} download>`                    | link    | direct download anchor pointed at S3 URL                                | `href` is non-empty + `download` attr | href empty / 404 |
| status `role="status"` (after action)                 | status  | "Preview transport toggled." / "Loop flag saved." / "library read-only" | visible after action                  | absent           |
| KPI cards (3)                                         | n/a     | BPM / Key / Duration cards each render the value                        | three cards visible                   | hidden           |
| not-found alert                                       | alert   | for invalid id, page shows red error panel + back link                  | error visible                         | crash            |

## Hidden surfaces opened from this page

| trigger | what it opens        | elements inside (selector / role / behavior) |
| ------- | -------------------- | -------------------------------------------- |
| (none)  | detail is one screen | n/a                                          |

## Network calls expected during normal use

| trigger                  | method | path               | what request body or query is expected  |
| ------------------------ | ------ | ------------------ | --------------------------------------- |
| initial load             | GET    | `/api/samples/:id` | sample row                              |
| toggle loop (own sample) | PUT    | `/api/samples/:id` | `{ is_loop: bool }` returns updated row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/samples__id.spec.ts`
