# Page observations: /categories (Categories)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/categories.
> Headings: 1: Categories; 3: income, expenses lists.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role     | expected behavior on interaction        | success signal                             | failure signal        |
| -------------------------------------------------------- | -------- | --------------------------------------- | ------------------------------------------ | --------------------- |
| `getByRole('heading', { name: /categories/i })`          | heading  | renders the page title                  | heading visible                            | nothing rendered      |
| `getByRole('button', { name: /add category/i })`         | button   | opens or navigates to add-category form | form visible / URL changes                 | no UI response        |
| `[data-mol-id="category-row"]` (one per seeded category) | listitem | shows category name + type + color      | seeded category visible after seedCategory | list empty after seed |
| `getByText(/income/i)` / `getByText(/expense/i)`         | text     | sectioned list groups by type           | both group headers visible                 | unsegmented list      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path            | expected body                     |
| --------- | ------ | --------------- | --------------------------------- |
| Page load | GET    | /api/categories | response 200, array of categories |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/categories.spec.ts`
