# Page observations: /shared

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role | expected behavior on interaction        | success signal          | failure signal |
| -------------------------- | ---- | --------------------------------------- | ----------------------- | -------------- |
| empty state body           | text | shown for accounts without public decks | body not empty          | blank page     |
| public deck card           | link | when present, links to a deck preview   | visible per public deck | no card        |
| Sidebar "Shared" link      | link | highlights the current page             | visible in nav          | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected      |
| ------------ | ------ | ------------------ | ------------------------------------------- |
| initial load | GET    | /api/presentations | list filtered to is_public=true client-side |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/shared.spec.ts`
