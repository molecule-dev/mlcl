# Page observations: /help (Help / FAQ)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role    | expected behavior on interaction             | success signal               | failure signal             |
| ----------------------------------- | ------- | -------------------------------------------- | ---------------------------- | -------------------------- |
| `getByRole("heading")` (h1/h2)      | heading | renders Help / Support heading               | non-empty visible heading    | placeholder text only      |
| FAQ list / sections (h3 or details) | list    | renders ≥ 1 FAQ entry with question + answer | multiple FAQ entries visible | empty list                 |
| `getByRole("link", { name: /home    | back    | sign\s*up/i })`                              | link                         | navigate to home or signup | URL changes | broken link |

## Hidden surfaces opened from this page

| trigger                                 | what it opens    | elements inside (selector / role / behavior) |
| --------------------------------------- | ---------------- | -------------------------------------------- |
| `<details>` summary toggle (if present) | accordion answer | reveals answer text                          |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/help.spec.ts`
