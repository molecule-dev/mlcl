# Page observations: /generator (Generator)

> Filled from a live walk via Playwright MCP at /generator. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role   | expected behavior on interaction             | success signal                  | failure signal   |
| ---------------------------------------------- | ------ | -------------------------------------------- | ------------------------------- | ---------------- |
| `getByTestId('generator-output')`              | text   | show generated password on mount             | non-empty password visible      | output empty     |
| `getByRole('button', { name: /regenerate/i })` | button | produce a new password each click            | output text changes             | output unchanged |
| `getByRole('tab', { name: /passphrase/i })`    | tab    | switch to passphrase mode (hyphenated words) | output contains hyphens + words | mode unchanged   |
| `getByRole('tab', { name: /pin/i })`           | tab    | switch to PIN mode (digits only)             | output is digits only           | mode unchanged   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

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
- [x] All elements above have a corresponding test in the matching spec
