# Page observations: /terms (Terms of Service)

> Public — long-form terms rendering acceptable-use, billing, content,
> termination, and contact sections.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role        | expected behavior on interaction | success signal                              | failure signal  |
| ----------------------------------------------------- | ----------- | -------------------------------- | ------------------------------------------- | --------------- |
| `page.locator('[data-mol-id="page-terms"]')`          | container   | wraps the entire ToS body        | element visible                             | missing root    |
| `getByRole('heading', { name: /terms of service/i })` | heading     | top-of-page identifier           | h1 visible                                  | empty page      |
| `getByRole('heading', { name: /acceptable use/i })`   | heading     | acceptable-use section           | h2 visible                                  | section missing |
| `getByText(/recording                                 | consent/i)` | text                             | enumerates recording-consent obligation     | text visible    | obligation missing |
| `getByText(/subscription                              | billing/i)` | text                             | enumerates subscription/billing obligations | text visible    | section missing    |
| `getByRole('heading', { name: /termination/i })`      | heading     | termination section              | h2 visible                                  | section missing |
| `getByRole('heading', { name: /contact/i })`          | heading     | legal@ contact section           | h2 visible                                  | section missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

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
- [x] All elements above have a corresponding test in `e2e/07-terms.spec.ts`
