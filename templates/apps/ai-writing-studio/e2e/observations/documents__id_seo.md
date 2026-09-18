# Page observations: /documents/:id/seo (SEOAnalysis)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                | role    | expected behavior on interaction                               | success signal                                                                         | failure signal             |
| ------------------------------------------------------------------------- | ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| `getByText(/SEO analysis/i).first()`                                      | text    | eyebrow label renders                                          | text visible                                                                           | label missing              |
| `getByRole('heading', { name: /How this draft will travel/i, level: 1 })` | heading | hero title renders                                             | h1 visible                                                                             | h1 missing                 |
| `getByRole('button', { name: /Run analysis/i })`                          | button  | POSTs to `/api/seo/documents/:id/analyze` and reloads the list | `GET /api/seo/documents/:id/analyses` returns ≥1 row; UI shows score and history entry | no row added; UI unchanged |
| `getByRole('link', { name: /Back to editor/i })`                          | link    | navigates back to `/documents/:id`                             | URL becomes `/documents/<id>` (without `/seo`)                                         | URL unchanged              |
| `getByRole('heading', { name: /Target keywords/i, level: 3 })`            | heading | keyword section renders                                        | h3 visible                                                                             | section missing            |
| `getByRole('heading', { name: /Analysis history/i, level: 3 })`           | heading | history section renders                                        | h3 visible                                                                             | section missing            |
| `getByRole('heading', { name: /Suggested edits/i, level: 3 })`            | heading | suggestions section renders                                    | h3 visible                                                                             | section missing            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                            | what request body or query is expected                |
| ------------------ | ------ | ------------------------------- | ----------------------------------------------------- |
| initial render     | GET    | /api/seo/documents/:id/analyses | returns array of analysis rows for the document       |
| Run analysis click | POST   | /api/seo/documents/:id/analyze  | `{ target_keywords: [] }` → 201 with new analysis row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/documents__id_seo.spec.ts`
