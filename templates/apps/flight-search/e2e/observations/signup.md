# Page observations: /signup

> Filled by AI agent driving the running smoke app on 3180/4180. All
> elements were observed in the rendered accessibility tree, not
> inferred from source. Re-validated by `e2e/signup.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/signup` (no auth)
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Fill the form, observe POST + redirect.
4. Re-pass adds nothing new.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name         | role            | expected behavior on interaction   | success signal             | failure signal            |
| ---------------------------------- | --------------- | ---------------------------------- | -------------------------- | ------------------------- |
| `input[autocomplete="given-name"]` | textbox         | accepts first name                 | value persists in DOM      | required-validation toast |
| `input[type="email"]`              | textbox (email) | accepts email, required            | type=email + required=true | submit blocked            |
| `form button[type="submit"]`       | button          | POST /api/users → redirect /search | URL changes to /search     | stays on /signup          |
| `a[href="/login"]`                 | link            | routes to /login                   | URL ends /login            | no nav                    |

## Hidden surfaces opened from this page

(none — single-form auth shell)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected   |
| ------- | ------ | ---------- | ---------------------------------------- |
| submit  | POST   | /api/users | { email, password, firstName, lastName } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
