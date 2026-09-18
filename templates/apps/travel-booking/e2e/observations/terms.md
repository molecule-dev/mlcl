# Page observations: /terms (Terms)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role      | expected behavior on interaction                     | success signal    | failure signal       |
| -------------------------------------------------- | --------- | ---------------------------------------------------- | ----------------- | -------------------- |
| `getByRole('heading', { name: /Terms/i }).first()` | heading   | terms page heading visible                           | heading visible   | heading missing      |
| `locator('body')`                                  | container | page renders without crash                           | element visible   | page blank           |
| `getByText(/Sojourn                                | terms     | service                                              | agreement         | template/i).first()` | text | terms intro copy visible | text visible | text missing |
| `getByRole('heading')`                             | heading   | at least one heading is rendered (page is not blank) | element count ≥ 1 | zero headings        |
| `locator('html')`                                  | document  | document root renders                                | element visible   | DOM detached         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

(none — Terms is a fully static legal page; it makes no API calls.)

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
