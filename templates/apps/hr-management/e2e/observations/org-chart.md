# Page observations: /org-chart (OrgChart)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/org-chart.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/org-chart`.
2. `browser_snapshot` → walk every node in the rendered tree.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role    | expected behavior on interaction   | success signal          | failure signal           |
| --------------------------------------------- | ------- | ---------------------------------- | ----------------------- | ------------------------ |
| Page heading                                  | heading | static — page heading              | visible                 | missing                  |
| `getByRole('link', { name: /alex rivera/i })` | link    | navigates to /employees/{ceo-id}   | URL → /employees/{uuid} | row missing / wrong root |
| Direct-report link inside the tree            | link    | navigates to that employee profile | URL → /employees/{uuid} | row missing              |

## Hidden surfaces opened from this page

(none; tree is fully rendered up-front)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path          | what request body or query is expected |
| ------------- | ------ | ------------- | -------------------------------------- |
| initial mount | GET    | /api/org-tree | (authenticated bearer)                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/org-chart.spec.ts`
