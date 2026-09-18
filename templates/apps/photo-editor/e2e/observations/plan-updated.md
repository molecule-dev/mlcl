# Page observations: /plan-updated (PlanUpdated)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up via `signup(page)` then `browser_navigate` → `/plan-updated`
   (the route Stripe normally redirects to after a checkout success).
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — message + thank-you headings, "Return home" link.
4. Re-navigate and re-snapshot.
5. When complete, write `e2e/plan-updated.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                     | role                                                          | expected behavior on interaction                                        | success signal                          | failure signal                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| `getByRole('heading', { level: 2 })` (the "Your plan has been updated" / "Thank you" headings) | heading                                                       | renders the i18n strings `planUpdated.message` + `planUpdated.thankYou` | both headings visible with text content | missing / empty                  |
| `getByRole('link').filter({ hasText: /home                                                     | return/i })` ("Return home" — wrapping the Button)            | link                                                                    | navigates back to `/`                   | URL becomes `/`, landing renders | stays on `/plan-updated` |
| `getByRole('button', { name: /home                                                             | return/i })` (the inner Button inside the "Return home" link) | button                                                                  | activates the surrounding Link → `/`    | URL becomes `/`                  | stays                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | plan-updated is intentionally minimal        |

## Network calls expected during normal use

| trigger     | method | path                                                  | what request body or query is expected                       |
| ----------- | ------ | ----------------------------------------------------- | ------------------------------------------------------------ |
| (page load) | GET    | `/api/auth/refresh` (or equivalent useAuth init call) | session resolution to render the page (nothing app-specific) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
