# Page observations: /search (Cross-library search)

Captured via `node scripts/observe-page.mjs ai-study-buddy /search --auth`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role                   | expected behavior on interaction      | success signal       | failure signal         |
| ------------------------------------------------------ | ---------------------- | ------------------------------------- | -------------------- | ---------------------- |
| `[data-mol-id="page-search"]`                          | container              | top-level wrapper renders             | visible after auth   | redirected to `/login` |
| `getByRole('heading', { name: /search everything/i })` | heading h1             | renders title                         | visible              | missing                |
| `getByRole('searchbox')`                               | textbox                | typing dispatches `/api/search?q=...` | results re-render    | no fetch               |
| `getByRole('button', { name: /^go$/i })`               | button                 | submits the search query              | search dispatched    | nothing                |
| `getByRole('tab', { name: 'All' })`                    | tab (default selected) | filter to all types                   | active state         | filter ignored         |
| `getByRole('tab', { name: 'Course' })`                 | tab                    | filter to courses only                | active state         | filter ignored         |
| `getByRole('tab', { name: 'Flashcard deck' })`         | tab                    | filter to decks only                  | active state         | filter ignored         |
| `getByRole('tab', { name: 'Note' })`                   | tab                    | filter to notes only                  | active state         | filter ignored         |
| `getByRole('tab', { name: 'Quiz' })`                   | tab                    | filter to quizzes only                | active state         | filter ignored         |
| `getByText(/nothing matched/i)`                        | text                   | empty state when no results           | visible for new user | replaced by results    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger      | method | path                                 | what request body or query is expected |
| ------------ | ------ | ------------------------------------ | -------------------------------------- |
| page mount   | GET    | `/api/search?`                       | `{ data: [] }` empty results           |
| Submit query | GET    | `/api/search?q=<term>`               | matched results array                  |
| Tab click    | GET    | `/api/search?q=<term>&type=<filter>` | filtered results                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/31-search.spec.ts`
