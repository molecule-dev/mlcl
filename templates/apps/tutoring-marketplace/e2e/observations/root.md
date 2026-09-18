# Page observations: / (Landing)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction | success signal                          | failure signal      |
| --------------------------------------------------------- | ------- | -------------------------------- | --------------------------------------- | ------------------- |
| `getByRole('link', { name: /^chalk$/i })`                 | link    | back to /                        | URL is /                                | nav fails           |
| `getByRole('link', { name: /find tutors/i })`             | link    | go to /search                    | URL is /search                          | nav fails           |
| `getByRole('link', { name: /teach on chalk/i })`          | link    | go to /become-tutor              | URL is /become-tutor                    | nav fails           |
| `getByRole('link', { name: /pricing/i })`                 | link    | go to /pricing                   | URL is /pricing                         | nav fails           |
| `getByRole('button', { name: /toggle theme/i })`          | button  | flips html data-theme            | data-mol-mode flips and survives reload | attribute unchanged |
| `getByRole('link', { name: /sign in/i })`                 | link    | go to /login                     | URL is /login                           | nav fails           |
| `getByRole('link', { name: /get started/i })`             | link    | go to /signup                    | URL is /signup                          | nav fails           |
| `getByPlaceholder('Search subjects, tutors, or topics…')` | textbox | accepts text                     | value typed                             | rejected            |
| `getByRole('button', { name: /find tutor/i })`            | button  | submits hero search              | navigates to /search?q=...              | nav missing         |
| `getByRole('button', { name: /^math$/i })`                | button  | quick filter math                | /search?subject=math                    | URL missing param   |
| `getByRole('link', { name: /browse all tutors/i })`       | link    | go to /search                    | URL is /search                          | nav fails           |
| `getByRole('link', { name: /apply to teach/i })`          | link    | go to /become-tutor              | URL is /become-tutor                    | nav fails           |
| Featured tutor card link                                  | link    | navigates to /tutor/:id          | URL contains /tutor/                    | nav fails           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path        | what request body or query is expected                     |
| --------- | ------ | ----------- | ---------------------------------------------------------- |
| page load | GET    | /api/tutors | returns 3 demo tutors with display names Maya/Adaeze/Kenji |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
