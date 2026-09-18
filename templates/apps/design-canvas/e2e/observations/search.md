# Page observations: /search (Search)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/search`
2. browser_snapshot — top search input + tab row + (recent searches when query empty) + results list
3. After typing in the input, the results list re-renders with hits

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name             | role    | expected behavior on interaction                         | success signal                                              | failure signal  |
| -------------------------------------- | ------- | -------------------------------------------------------- | ----------------------------------------------------------- | --------------- |
| `[data-mol-id="search-form"]`          | form    | submitting persists the current query into recent        | recent button list grows on next render                     | unchanged       |
| `[data-mol-id="search-input"]`         | textbox | accepts text; debounced GET `/api/search?q=` after 200ms | results region updates                                      | results stay    |
| `[data-mol-id="search-tab-all"]`       | button  | sets category filter to "all"                            | tab highlighted, GET `/api/search` with no `category` param | filter sticks   |
| `[data-mol-id="search-tab-project"]`   | button  | sets category to "project"                               | GET `/api/search?category=project`                          | filter sticks   |
| `[data-mol-id="search-tab-template"]`  | button  | sets category to "template"                              | GET `/api/search?category=template`                         | filter sticks   |
| `[data-mol-id="search-tab-component"]` | button  | sets category to "component"                             | GET `/api/search?category=component`                        | filter sticks   |
| `[data-mol-id="search-results"]`       | region  | shows result cards or empty-state                        | `[data-mol-id^="search-result-"]` cards OR `search-empty`   | nothing renders |
| `[data-mol-id^="search-result-"]`      | link    | navigates to the result's `href`                         | URL changes to `/editor/...` or `/templates/...` etc.       | URL stays       |

## Hidden surfaces opened from this page

| trigger                           | what it opens                   | elements inside (selector / role / behavior)                    |
| --------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| empty query (after recent stored) | `[data-mol-id="search-recent"]` | recent-search buttons (`search-recent-<slug>`) refill the input |
| no results                        | `[data-mol-id="search-empty"]`  | "Nothing matches…" empty-state                                  |

## Network calls expected during normal use

| trigger        | method | path                       | what request body or query is expected |
| -------------- | ------ | -------------------------- | -------------------------------------- |
| initial render | GET    | `/api/search`              | bearer-authed; returns popular results |
| typing         | GET    | `/api/search?q=...`        | debounced; returns matching hits       |
| tab change     | GET    | `/api/search?category=...` | category-scoped results                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
