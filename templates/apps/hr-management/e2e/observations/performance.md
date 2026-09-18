# Page observations: /performance (Performance)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/performance.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/performance`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role    | expected behavior on interaction                                                       | success signal                                | failure signal           |
| ---------------------------------------- | ------- | -------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------ |
| Performance heading + seeded review rows | view    | static — heading + seeded reviews populated from /api/performance                      | heading visible, at least one row visible     | empty / "Failed to load" |
| `/api/performance` API endpoint          | request | GET /api/performance returns seeded review list with non-empty status                  | array length > 0, every row has status string | non-200 / missing fields |
| Status badge text                        | text    | renders one of the canonical review statuses (open / submitted / closed / in progress) | badge text visible                            | missing                  |

## Hidden surfaces opened from this page

(none; current performance view is read-only summary)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path             | what request body or query is expected |
| ------------- | ------ | ---------------- | -------------------------------------- |
| initial mount | GET    | /api/performance | (authenticated bearer)                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/performance.spec.ts`
