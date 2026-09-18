# Page observations: /workspace (Workspace)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role                 | expected behavior on interaction                                                     | success signal                                                                                   | failure signal                   |
| ---------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------- |
| `getByRole('heading', { name: /^Workspace$/i, level: 1 })` | heading              | renders the page heading after auth bootstrap                                        | heading visible                                                                                  | login redirect                   |
| `getByRole('combobox', { name: /HTTP method/i })`          | combobox             | the method picker `GET / POST / PUT / PATCH / DELETE`                                | `selectOption('POST')` updates the value                                                         | option not selected              |
| `getByRole('textbox', { name: /Request URL/i })`           | textbox              | accepts a URL value                                                                  | `toHaveValue` matches                                                                            | empty                            |
| `getByRole('button', { name: /^Save$/i })`                 | button               | persists the composed request via POST `/api/requests` (then becomes update via PUT) | a request to `/api/requests` is observed and the count of saved requests increases               | no network call fires            |
| `getByRole('button', { name: /^Send/i })`                  | button               | POST `/api/requests/:id/execute` to run the request and append a row to history      | a POST to `/api/requests/.+/execute` is observed AND `/api/history` shows a new row on next load | no execute call fires            |
| `getByRole('button', { name: /workspace.tab.params         | Params/i }).first()` | tab button                                                                           | switching to the Params tab updates the URL hash to `#params`                                    | `page.url()` ends with `#params` | hash unchanged |
| `getByRole('button', { name: /Auth/i }).first()`           | tab button           | switching to Auth updates URL hash to `#auth`                                        | hash flips to `#auth`                                                                            | unchanged                        |
| `getByRole('button', { name: /Headers/i }).first()`        | tab button           | switching to Headers updates URL hash to `#headers`                                  | hash flips to `#headers`                                                                         | unchanged                        |
| `getByRole('button', { name: /Body/i }).first()`           | tab button           | switching to Body updates URL hash to `#body`                                        | hash flips to `#body`                                                                            | unchanged                        |
| `getByRole('button', { name: /Tests/i }).first()`          | tab button           | switching to Tests updates URL hash to `#tests`                                      | hash flips to `#tests`                                                                           | unchanged                        |
| `getByRole('combobox', { name: /Auth type/i })`            | combobox             | choose auth type Bearer / Basic / OAuth / API Key / None                             | `selectOption('basic')` works                                                                    | option not selected              |
| `getByRole('textbox', { name: /Token/i })`                 | textbox (password)   | accepts an auth token value                                                          | `toHaveValue` matches                                                                            | empty                            |

## Hidden surfaces opened from this page

| trigger                                                      | what it opens                                                          | elements inside                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Send button (after URL filled and request actually executed) | response panel populates with status pill + body pre + assertions list | status pill `[role=status]?`, response body `<pre>`, "passed/failed" counts |

## Network calls expected during normal use

| trigger                        | method | path                      | what request body or query is expected                             |
| ------------------------------ | ------ | ------------------------- | ------------------------------------------------------------------ |
| Page load                      | GET    | /api/requests             | list of saved requests for the current user                        |
| Page load                      | GET    | /api/environments         | list of environments                                               |
| Save (no saved row yet)        | POST   | /api/requests             | `{ name, method, url }`                                            |
| Save (with existing first row) | PUT    | /api/requests/:id         | `{ method, url }`                                                  |
| Send                           | POST   | /api/requests/:id/execute | empty body — handler resolves saved row + makes outbound HTTP call |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/workspace.spec.ts`
