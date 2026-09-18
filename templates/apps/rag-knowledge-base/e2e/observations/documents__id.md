# Page observations: /documents/:id (DocumentDetail)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`); requires an
      existing document via `createDocument(page, accessToken)`

## Elements

| selector / accessible name                         | role            | expected behavior on interaction                  | success signal                    | failure signal         |
| -------------------------------------------------- | --------------- | ------------------------------------------------- | --------------------------------- | ---------------------- |
| `[data-testid="documentDetail-header"]`            | banner          | renders document title + metadata                 | banner visible with the doc title | banner missing         |
| `[data-testid="documentDetail-metric-tile"]` (any) | text            | renders metric tiles (chunks, words, size, pages) | tiles visible                     | tiles missing          |
| `getByRole('link', { name: /back                   | documents/i })` | link                                              | navigates back to /documents      | URL becomes /documents | stays on detail |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path               | what request body or query is expected |
| ------- | ------ | ------------------ | -------------------------------------- |
| mount   | GET    | /api/documents     | scoped to current user                 |
| mount   | GET    | /api/documents/:id | scoped to current user                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/documents__id.spec.ts`
