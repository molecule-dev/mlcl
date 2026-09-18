# Page observations: /maintenance/:id (Maintenance work-order detail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).
- [x] `:id` resolves to a real seeded maintenance row (use the first row from `/maintenance` list).
- [x] Demo seed populates parts/labor/events JSON in the `details_json` column.

## Elements

| selector / accessible name                                                   | role     | expected behavior on interaction                      | success signal                        | failure signal         |
| ---------------------------------------------------------------------------- | -------- | ----------------------------------------------------- | ------------------------------------- | ---------------------- |
| `getByRole('link', { name: /all maintenance/i })`                            | link     | navigate back to `/maintenance`                       | URL ends with `/maintenance`          | stays                  |
| `getByText(/work order/i)` (header label)                                    | text     | header label "Work order · <uuid>"                    | uuid visible in font-mono             | absent                 |
| `getByRole('heading', { level: 1 })`                                         | heading  | shows the maintenance description                     | non-empty heading text                | empty / generic        |
| `getByRole('link').filter({ hasText: /^[A-Z0-9-]+$/ })` (vehicle_plate link) | link     | navigate to `/vehicles/<vehicle_id>`                  | URL changes to `/vehicles/<uuid>`     | stays                  |
| Header subtitle text                                                         | text     | shows `<plate> · <type> · Scheduled <localized date>` | full subtitle visible                 | partial / empty        |
| `getByRole('heading', { name: /^parts$/i })`                                 | heading  | section heading for parts list                        | visible                               | section missing        |
| Parts list row (e.g. by SKU)                                                 | listitem | row with SKU + name + ×qty + line total               | at least one part visible (~3 seeded) | empty list             |
| Parts total row                                                              | text     | sum of `cost × quantity` for all parts                | matches "$xxx.xx"                     | "$0.00"                |
| Labor row                                                                    | text     | `labor_hours × labor_rate` formatted as money         | "$xxx.xx"                             | "$0.00"                |
| Total estimate row                                                           | text     | parts total + labor total                             | "$xxx.xx" non-zero                    | "$0.00"                |
| `getByRole('heading', { name: /^activity$/i })`                              | heading  | section heading for events timeline                   | visible                               | missing                |
| Activity event row (`<ol> > li`)                                             | listitem | row with date + description                           | at least one event row                | empty list             |
| `getByRole('heading', { name: /^notes$/i })` (when notes present)            | heading  | renders notes section only when `notes` is non-empty  | visible when notes set                | rendered when no notes |

## Hidden surfaces opened from this page

| trigger                   | what it opens | elements inside (selector / role / behavior) |
| ------------------------- | ------------- | -------------------------------------------- |
| (none — read-only detail) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger       | method | path                 | what request body or query is expected                                             |
| ------------- | ------ | -------------------- | ---------------------------------------------------------------------------------- |
| Initial mount | GET    | /api/maintenance/:id | shaped record incl. parts[], labor_hours, labor_rate, events[] from `details_json` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/maintenance.spec.ts` (detail-section)
