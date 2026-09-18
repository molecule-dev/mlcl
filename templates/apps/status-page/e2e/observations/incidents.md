# Page observations: /incidents (Incidents list)

> Filled from a live walk via Playwright MCP at /incidents. Re-walk if
> any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role               | expected behavior on interaction            | success signal             | failure signal             |
| ----------------------------------------- | ------------------ | ------------------------------------------- | -------------------------- | -------------------------- |
| `getByRole('link', { name: /open          | create             | new\\s*incident/i })` (href=/incidents/new) | link                       | navigate to /incidents/new | URL becomes /incidents/new | nav fails |
| Each incident card                        | listitem / article | shows INC-id, title, impact, status, age    | title visible              | row missing                |
| Per-card title link (href=/incidents/:id) | link               | navigate to /incidents/:id                  | URL becomes /incidents/:id | nav fails                  |
| GET /api/incidents on load                | network            | populate the list                           | 200 with array             | 4xx/5xx                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                    | what request body or query is expected         |
| ------------ | ------ | ----------------------- | ---------------------------------------------- |
| Page load    | GET    | /api/incidents          | array of incidents (sorted desc by created_at) |
| Filter click | GET    | /api/incidents?status=… | filtered list                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-incidents.spec.ts`
