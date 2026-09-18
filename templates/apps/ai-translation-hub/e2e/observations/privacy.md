# Page observations: /privacy (Privacy)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/privacy.
> Headings observed: 1: Privacy policy, 2: What we collect, 2: Subprocessors, 2: Deleting your data.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role    | expected behavior on interaction  | success signal | failure signal |
| ---------------------------------------------------- | ------- | --------------------------------- | -------------- | -------------- |
| `getByRole('link', { name: /← Back to home/i })`     | a       | navigates to /                    | URL becomes /  | no change      |
| `getByRole('heading', { name: /What we collect/i })` | heading | renders heading "What we collect" | visible        | absent         |
| `getByRole('heading', { name: /Subprocessors/i })`   | heading | renders heading "Subprocessors"   | visible        | absent         |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
