# Page observations: /terms (Terms)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/terms.
> Headings observed: 1: Terms of service, 2: Your account, 2: Acceptable use, 2: Billing, 2: Changes.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal | failure signal |
| --------------------------------------------------- | ------- | -------------------------------- | -------------- | -------------- |
| `getByRole('link', { name: /← Back to home/i })`    | a       | navigates to /                   | URL becomes /  | no change      |
| `getByRole('heading', { name: /Your account/i })`   | heading | renders heading "Your account"   | visible        | absent         |
| `getByRole('heading', { name: /Acceptable use/i })` | heading | renders heading "Acceptable use" | visible        | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
