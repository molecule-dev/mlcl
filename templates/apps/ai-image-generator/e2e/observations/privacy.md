# Page observations: /privacy (privacy)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role                       | expected behavior on interaction | success signal              | failure signal                     |
| ------------------------------------------------------ | -------------------------- | -------------------------------- | --------------------------- | ---------------------------------- |
| `getByRole("heading", { name: /Privacy/i, level: 1 })` | heading                    | render heading                   | visible                     | absent                             |
| `getByText(/personal data                              | information we collect/i)` | text                             | render real privacy content | visible non-placeholder paragraph  | placeholder text "Replace this placeholder" |
| `getByText(/contact                                    | reach us at/i)`            | text                             | show contact / DPO mention  | visible mention of contact channel | absent                                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
