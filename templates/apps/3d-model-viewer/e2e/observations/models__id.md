# Page observations: /models/:id (ModelViewer)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated and the URL `:id` corresponds to a model owned by the signed-in user

## Elements

| selector / accessible name  | role       | expected behavior on interaction                     | success signal               | failure signal             |
| --------------------------- | ---------- | ---------------------------------------------------- | ---------------------------- | -------------------------- |
| Owner navigates to viewer   | navigation | URL `/models/:id` resolves and renders               | URL matches and page loads   | redirected back to /models |
| Cross-user PUT /models/:id  | network    | unauthorized owner gets 4xx                          | response status >= 400       | accepted                   |
| GET /api/models/:id payload | network    | returns the model row with id, name, format, user_id | row matches what was created | shape mismatch             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/models__id.spec.ts`
