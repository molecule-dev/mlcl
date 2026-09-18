# Page observations: /onboarding (Onboarding)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/onboarding.spec.ts`.

## Procedure

1. `signup(page)` → navigate to `/onboarding`.
2. `browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role    | expected behavior on interaction                              | success signal                             | failure signal           |
| --------------------------------------- | ------- | ------------------------------------------------------------- | ------------------------------------------ | ------------------------ |
| Page heading + onboarding journey cards | view    | static — page heading + seeded journeys (one per recent hire) | heading visible, at least one card present | "Failed to load" / empty |
| `/api/onboarding` API endpoint          | request | GET /api/onboarding returns the seeded journey list           | array contains Isla Romano or Marco Webb   | non-200 / empty array    |
| Per-card progress text                  | text    | shows "X of Y steps complete" or "X / Y" pair                 | numeric pair visible in DOM                | missing                  |

## Hidden surfaces opened from this page

(none; current onboarding view is read-only summary)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path            | what request body or query is expected |
| ------------- | ------ | --------------- | -------------------------------------- |
| initial mount | GET    | /api/onboarding | (authenticated bearer)                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/onboarding.spec.ts`
