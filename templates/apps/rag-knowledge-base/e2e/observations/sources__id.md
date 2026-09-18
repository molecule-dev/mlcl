# Page observations: /sources/:id (SourceDetail)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`); requires an
      existing source via `createSource(page, accessToken)`

## Elements

| selector / accessible name                  | role          | expected behavior on interaction            | success signal                      | failure signal       |
| ------------------------------------------- | ------------- | ------------------------------------------- | ----------------------------------- | -------------------- |
| `[data-testid="sourceDetail-title"]`        | heading       | renders the source label as a heading       | heading visible with the label text | heading missing      |
| `[data-testid="sourceDetail-status-badge"]` | text          | renders the current sync_status as a badge  | badge visible                       | badge missing        |
| `[data-testid="sourceDetail-sync-now"]`     | button        | PUT /api/sources/:id with sync_status=ready | status badge re-renders             | error visible        |
| `getByRole('link', { name: /back            | sources/i })` | link                                        | navigates back to /sources          | URL becomes /sources | stays on detail |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path             | what request body or query is expected |
| ------- | ------ | ---------------- | -------------------------------------- |
| mount   | GET    | /api/sources/:id | scoped to current user                 |
| mount   | GET    | /api/documents   | scoped to current user                 |
| sync    | PUT    | /api/sources/:id | { sync_status }                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sources__id.spec.ts`
