# Page observations: /repos (Repositories)

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/repos`.
> Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role     | expected behavior on interaction                                                                            | success signal                                              | failure signal                            |
| --------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `getByRole('heading', { name: /^Repositories$/ })`              | heading  | renders page heading                                                                                        | h1 visible                                                  | missing                                   |
| `getByText(/No repositories connected yet/i)`                   | text     | empty-state copy after fresh signup                                                                         | text visible                                                | populated rows on a fresh user            |
| `getByRole('button', { name: /Connect repository/i })` (toggle) | button   | toggles the connect form open / closed; aria-expanded mirrors state                                         | form visible after click, hidden after Cancel               | nothing happens / aria stuck              |
| `getByLabel(/Provider/i)` (`<select>`)                          | combobox | switches between `github` and `gitlab`                                                                      | `select.value` changes                                      | locked                                    |
| `getByLabel(/Full name/i)`                                      | textbox  | full-name input (required)                                                                                  | enterable                                                   | not focusable                             |
| `getByRole('button', { name: /Add repository/i })` (submit)     | button   | POST `/api/repositories` with `{ provider, full_name, default_branch }`; row shows + persists across reload | repo full_name visible in list AND survives `page.reload()` | no row, no POST, or row gone after reload |
| empty-name submit                                               | n/a      | HTML `required` blocks submit; no POST fires                                                                | POST count remains 0                                        | POST fires for empty name                 |
| repo card click                                                 | link     | navigates to `/repos/:id` detail page                                                                       | URL becomes `/repos/<uuid>`                                 | stays on `/repos`                         |

## Hidden surfaces opened from this page

| trigger                   | what it opens                     | elements inside (selector / role / behavior)                           |
| ------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Connect repository button | inline connect form (collapsible) | `<select>` provider, `<input>` full name, submit button, cancel button |

## Network calls expected during normal use

| trigger               | method | path                | what request body or query is expected                           |
| --------------------- | ------ | ------------------- | ---------------------------------------------------------------- |
| initial load          | GET    | `/api/repositories` | owner-scoped repository list                                     |
| Add repository submit | POST   | `/api/repositories` | `{ provider, full_name, default_branch }` → 201 with the new row |
| reload after create   | GET    | `/api/repositories` | new row included in returned list                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (connect form)
- [x] Every form has every field documented (provider, full_name)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/repos.spec.ts`
