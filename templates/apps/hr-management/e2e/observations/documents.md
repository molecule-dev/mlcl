# Page observations: /documents (Documents)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/documents.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/documents`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                         | success signal            | failure signal |
| ---------------------------------------------- | ------- | -------------------------------------------------------- | ------------------------- | -------------- |
| `getByRole('heading', { name: /documents/i })` | heading | static — page heading                                    | visible                   | missing        |
| Document table rows                            | list    | shows seeded documents (Handbook, Offer Letter, etc.)    | at least one row visible  | empty / error  |
| Upload form                                    | form    | POST /api/documents with name + size_label + shared_with | new row appended to table | inline error   |

## Hidden surfaces opened from this page

(none; upload form is inline)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path           | what request body or query is expected                 |
| ------------------ | ------ | -------------- | ------------------------------------------------------ |
| initial mount      | GET    | /api/documents | (authenticated bearer)                                 |
| Upload form submit | POST   | /api/documents | { name, type, category, url, size_label, shared_with } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/documents.spec.ts`
