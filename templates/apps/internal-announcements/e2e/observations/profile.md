# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role           | expected behavior on interaction               | success signal                                         | failure signal                     |
| ------------------------------------------------ | -------------- | ---------------------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| profile header (name + email)                    | text           | shows logged-in user's first/last name + email | name visible, matches signup data                      | placeholder/different user         |
| `getByTestId("profile-tab-posts")`               | button         | shows announcements I authored                 | active tab styling, list matches my authored posts     | nothing                            |
| `getByTestId("profile-tab-acks")`                | button         | shows announcements I acknowledged             | active tab styling, list matches `/me/acknowledgments` | nothing                            |
| `getByTestId("profile-tab-mentions")`            | button         | shows mentions of me                           | active tab styling                                     | nothing                            |
| `getByRole("button", { name: /Sign out           | SIGN OUT/i })` | button                                         | clears auth                                            | URL `/login`, localStorage cleared | unchanged |
| `getByRole("button", { name: /Toggle theme/i })` | button         | flips theme                                    | `data-mol-mode` flips                                  | unchanged                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                                    | what request body or query is expected |
| --------- | ------ | --------------------------------------- | -------------------------------------- |
| Page load | GET    | `/api/users/me`                         | refresh user record                    |
| Page load | GET    | `/api/announcements`                    | derive my-posts, mentions tabs         |
| Page load | GET    | `/api/announcements/me/acknowledgments` | derive acks tab                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
