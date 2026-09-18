# Page observations: /favorites (Favorites)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role                | expected behavior on interaction                                      | success signal                                     | failure signal                          |
| ----------------------------------------------------- | ------------------- | --------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| `getByRole('heading', { name: /Saved properties/i })` | heading             | favorites page renders + GET /api/favorites fires                     | heading visible + GET in network                   | heading missing or 4xx                  |
| `getByText(/Saved for later/i)`                       | text                | eyebrow visible                                                       | text visible                                       | text missing                            |
| `getByText(/saved.*auto.priced                        | No saved properties | saved/i).first()`                                                     | text                                               | subheading or empty-state text rendered | text visible | text missing |
| `getByRole('link', { name: /Browse stays/i })`        | link                | empty-state CTA navigates to /search (visible only when no favorites) | URL becomes /search OR link absent (has favorites) | navigation fails when link present      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger         | method      | path                         | what request body or query is expected     |
| --------------- | ----------- | ---------------------------- | ------------------------------------------ |
| navigate        | GET         | `/api/favorites`             | 200 with array of saved property summaries |
| toggle bookmark | POST/DELETE | `/api/favorites/:propertyId` | toggle persistence for current user        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/favorites.spec.ts`
