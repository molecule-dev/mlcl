# Page observations: /schedule (Schedule)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role         | expected behavior on interaction                                        | success signal                                | failure signal        |
| ------------------------------------------ | ------------ | ----------------------------------------------------------------------- | --------------------------------------------- | --------------------- |
| Schedule heading                           | heading      | renders Weekly schedule heading                                         | visible                                       | absent                |
| Day-of-week column headers                 | columnheader | renders Mon–Sun column headers                                          | 7 visible columns                             | wrong column count    |
| Hour rows                                  | row          | renders dose dots in hour-of-day rows from `GET /api/doses?filter=week` | a dot is visible for each scheduled dose hour | no dots after seeding |
| Schedule (POST/PATCH/PUT/DELETE) — backend | network      | exercised via /api/schedules CRUD round-trip                            | round-trip persists                           | endpoint missing      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path                   | what request body or query is expected |
| ---------- | ------ | ---------------------- | -------------------------------------- |
| Page mount | GET    | /api/doses?filter=week | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/schedule.spec.ts`
