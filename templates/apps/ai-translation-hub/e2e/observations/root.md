# Page observations: / (Root)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/.
> Headings observed: 1: Meaning without borders., 2: Editorial precision, AI velocity., 3: AI-assisted segments, 3: Translation memory, 3: Domain glossary.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role | expected behavior on interaction | success signal | failure signal |
| ------------------------------------------- | ---- | -------------------------------- | -------------- | -------------- |
| `getByRole('link', { name: /Product/i })`   | a    | navigates to #features           | visible result | no change      |
| `getByRole('link', { name: /Languages/i })` | a    | navigates to #languages          | visible result | no change      |
| `getByRole('link', { name: /Pricing/i })`   | a    | navigates to #pricing            | visible result | no change      |

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
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
