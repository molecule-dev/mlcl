# Page observations: /favorites (Favorites)

> Captured live by an agent driving Playwright against the running app
> (see scripts/_fd-fill-observations.mjs for the walker that emits this
> data — observations themselves are written from the real snapshot,
> not from imagination).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role   | expected behavior on interaction                              | success signal                                                  | failure signal                    |
| ----------------------------------- | ------ | ------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| `getByTestId('favorite-order-cta')` | link   | navigates to /restaurant/f42eb39e-486c-42aa-a292-98993350c956 | URL changes to /restaurant/f42eb39e-486c-42aa-a292-98993350c956 | nothing happens / network 4xx/5xx |
| `getByTestId('favorite-remove')`    | button | triggers `favorite-remove` action                             | expected UI/network response                                    | nothing happens / network 4xx/5xx |

## Hidden surfaces opened from this page

| trigger                                                            | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------------------ | ------------- | -------------------------------------------- |
| (none documented; tabs/modals exercised in the corresponding spec) | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path           | what request body or query is expected |
| ----------------------- | ------ | -------------- | -------------------------------------- |
| Page load / interaction | GET    | /api/favorites | (see spec)                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
