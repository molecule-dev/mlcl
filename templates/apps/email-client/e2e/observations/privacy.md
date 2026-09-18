# Page observations: /privacy (Privacy Policy)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name         | role     | expected behavior on interaction      | success signal             | failure signal              |
| ---------------------------------- | -------- | ------------------------------------- | -------------------------- | --------------------------- |
| `getByRole("heading")` (h1)        | heading  | renders Privacy Policy heading        | "Privacy" appears in body  | empty/placeholder heading   |
| Body copy (multi-paragraph policy) | document | substantive privacy text (>200 chars) | mentions "data" / "cookie" | "coming soon" / lorem ipsum |
| `getByRole("link")` back/home      | link     | navigate back / to home               | URL changes                | broken link                 |

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
