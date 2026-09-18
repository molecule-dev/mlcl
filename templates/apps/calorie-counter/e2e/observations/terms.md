# Page observations: /terms (Terms)

Source: live walk via Playwright + e2e/terms.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                    | success signal                        | failure signal     |
| ---------------------------------------------------- | ------- | --------------------------------------------------- | ------------------------------------- | ------------------ |
| `getByRole("heading", { level: 1, name: /terms/i })` | heading | renders Terms heading                               | heading visible                       | heading missing    |
| terms intro paragraph                                | text    | renders intro copy                                  | paragraph visible                     | paragraph missing  |
| main element                                         | main    | page renders inside <main data-mol-id="page-terms"> | main element with data-mol-id present | no main / wrong id |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                                                       | method | path | what request body or query is expected |
| ------------------------------------------------------------- | ------ | ---- | -------------------------------------- |
| _(none — fully static page; no backend interaction expected)_ |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
