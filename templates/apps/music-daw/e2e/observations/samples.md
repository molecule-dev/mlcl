# Page observations: /samples (Samples)

> Filled from a Playwright MCP walk of the live app. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                                  | success signal                  | failure signal                   |
| ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------- | ------------------------------- | -------------------------------- |
| `getByRole('heading', { name: /Samples & loops/i })`               | heading | page h1                                                           | visible                         | missing                          |
| eyebrow text "Library"                                             | text    | small uppercase label above h1                                    | visible                         | missing                          |
| count subtitle                                                     | text    | "{{count}} royalty-free assets..." reflects real `samples.length` | actual numeric count visible    | placeholder/zero on populated DB |
| `input[type="search"]` placeholder ~"Search by name, pack, or key" | textbox | client-side filter on name + pack                                 | typing narrows visible rows     | no narrowing                     |
| category chip `getByRole('button', { name: /^All$/ })`             | button  | filter to all categories                                          | selected style applied          | missing                          |
| category chip `getByRole('button', { name: /^Drums$/ })`           | button  | filter to category=drums; only drums show                         | only drum rows render           | category column shows non-drum   |
| category chip `getByRole('button', { name: /^Bass$/ })`            | button  | filter to category=bass                                           | only bass rows render           | wrong rows                       |
| category chip `getByRole('button', { name: /^Synths$/ })`          | button  | filter to category=synth                                          | only synth rows                 | wrong rows                       |
| category chip `getByRole('button', { name: /^Vocals$/ })`          | button  | filter to category=vocal                                          | only vocal rows                 | wrong rows                       |
| category chip `getByRole('button', { name: /^FX$/ })`              | button  | filter to category=fx                                             | only fx rows                    | wrong rows                       |
| sample row link `a[href*="/samples/"]`                             | link    | each row links to `/samples/:id` (SampleDetail)                   | URL becomes `/samples/<id>`     | broken link                      |
| empty-state                                                        | text    | "No samples match your filter." when filter+search returns 0      | visible after impossible search | hidden                           |

## Hidden surfaces opened from this page

| trigger | what it opens                     | elements inside (selector / role / behavior) |
| ------- | --------------------------------- | -------------------------------------------- |
| (none)  | no menus/modals on the index page | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| initial load | GET    | `/api/samples` | seeded library + own samples           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented (search input)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/samples.spec.ts`
