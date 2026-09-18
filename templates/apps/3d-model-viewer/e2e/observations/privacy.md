# Page observations: /privacy (Privacy)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required) — static legal page

## Elements

| selector / accessible name     | role           | expected behavior on interaction | success signal        | failure signal |
| ------------------------------ | -------------- | -------------------------------- | --------------------- | -------------- |
| `getByRole("heading").first()` | heading        | render privacy heading           | visible               | absent         |
| body text contains "privacy"   | static content | proves real content rendered     | text matches /privacy | data           | information/i | text empty |
| no 4xx/5xx responses           | network        | no failed responses for /privacy | all responses < 400   | any 4xx/5xx    |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
