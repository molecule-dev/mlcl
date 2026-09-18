# Page observations: /drafts (Drafts)

Observed via Playwright MCP at `/drafts` while authenticated.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role     | expected behavior on interaction                                      | success signal                       | failure signal     |
| ------------------------------------------------- | -------- | --------------------------------------------------------------------- | ------------------------------------ | ------------------ |
| `getByText(draft.title)`                          | text     | lists user's drafts (status=draft only — published articles excluded) | draft visible, published not visible | wrong status leaks |
| `getByRole('button', { name: /touched today/i })` | button   | filters list to drafts edited within the last 24h                     | recently-edited draft visible        | no filter applied  |
| draft row (e.g. `getByText('Edit me')`)           | link/row | navigates to /article/:id/edit                                        | URL changes to /article/:id/edit     | stays on /drafts   |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(none — drafts list is loaded synchronously via React-Query / GET /api/articles?status=draft;
spec relies on the rendered DOM rather than `captureNetwork`.)

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/drafts.spec.ts`
