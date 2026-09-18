# Page observations: /query (QueryEditor)

> Authenticated. The natural-language Ask Clarion bar drives
> POST /api/queries which returns a chart + SQL + insight.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                              | role    | expected behavior on interaction                          | success signal                                 | failure signal        |
| ----------------------------------------------------------------------- | ------- | --------------------------------------------------------- | ---------------------------------------------- | --------------------- |
| `getByRole('textbox', { name: /ask clarion a question/i })`             | textbox | accepts a natural-language prompt                         | input value reflects typed text                | input is read-only    |
| `getByRole('button', { name: /^ask$/i })`                               | button  | POST /api/queries with the prompt and renders chart + SQL | result section visible (chart + generated SQL) | error message visible |
| `page.getByRole('button').filter({ hasText: /top accounts/i }).first()` | button  | suggestion chip — auto-fills the prompt and submits       | result rendered                                | no request fired      |

## Hidden surfaces opened from this page

| trigger                                | what it opens | elements inside |
| -------------------------------------- | ------------- | --------------- |
| (none — query bar + result are inline) | —             | —               |

## Network calls expected during normal use

| trigger      | method | path         | expected body |
| ------------ | ------ | ------------ | ------------- |
| Submit query | POST   | /api/queries | `{ prompt }`  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-query.spec.ts`
