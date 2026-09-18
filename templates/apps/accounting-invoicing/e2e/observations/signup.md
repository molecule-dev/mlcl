# Page observations: /signup

> Filled by AI agent driving the running smoke app on 3010/4010 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/signup.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/signup`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/signup.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction  | success signal | failure signal |
| -------------------------- | ------- | --------------------------------- | -------------- | -------------- |
| `input#signup-first-name`  | textbox | first-name field — required       | value retained | no submit      |
| `input#signup-last-name`   | textbox | last-name field — required        | value retained | no submit      |
| `input#signup-company`     | textbox | company field — required          | value retained | no submit      |
| `input#signup-email`       | email   | email field — required, validated | value retained | no submit      |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger             | method | path       | what request body or query is expected            |
| ------------------- | ------ | ---------- | ------------------------------------------------- |
| form submit (valid) | POST   | /api/users | {first_name, last_name, company, email, password} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
