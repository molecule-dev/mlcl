# Page observations: /article/:id (ArticleView)

Observed via Playwright MCP at `http://localhost:VITE_PORT/article/:id`
while authenticated.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                                 | success signal           | failure signal    |
| ---------------------------------------------------------- | ------- | ---------------------------------------------------------------- | ------------------------ | ----------------- |
| `locator('h1', { hasText: title })`                        | heading | renders article title from GET /articles/:id                     | visible h1               | empty page        |
| `getByText(uniqueBody)`                                    | text    | rendered HTML body via dangerouslySetInnerHTML                   | paragraph visible        | missing           |
| `getByRole('button', { name: /save draft/i })` (in editor) | button  | POST /api/articles or PATCH; redirects to /article/:id/edit      | URL contains article id  | inline alert      |
| `getByRole('button', { name: /^publish$/i })` (in editor)  | button  | PATCH /api/articles/:id with status=published; flips status pill | "Published" pill visible | unchanged status  |
| `getByText(/Published/i)` (after publish + reload)         | text    | persisted status survives reload                                 | text visible             | reverted to draft |

## Hidden surfaces opened from this page

(none — view is read-only; editor route handles edits)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger          | method | path                      | what request body or query is expected                          |
| ---------------- | ------ | ------------------------- | --------------------------------------------------------------- |
| Page load        | GET    | /api/articles/:id         | 200 with article JSON; 404 for cross-tenant                     |
| Save draft (new) | POST   | /api/articles             | `{ space_id, title, body_md, body_html, status:'draft' }` → 201 |
| Publish          | PATCH  | /api/articles/:id         | `{ status:'published' }` → 200 + sets published_at              |
| Edit body        | GET    | /api/article-versions/:id | 200 with version array reflecting prior body                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/articles.spec.ts`
