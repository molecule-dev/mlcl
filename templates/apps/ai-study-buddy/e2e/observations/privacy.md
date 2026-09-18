# Page observations: /privacy (Privacy policy)

Captured via `node scripts/observe-page.mjs ai-study-buddy /privacy`.
Static marketing/legal page; no interactive content beyond navigation.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                     | role      | expected behavior on interaction | success signal  | failure signal  |
| -------------------------------------------------------------- | --------- | -------------------------------- | --------------- | --------------- |
| `getByRole('heading', { level: 1, name: /privacy policy/i })`  | heading   | renders the page title           | h1 visible      | h1 missing      |
| `getByRole('heading', { level: 2, name: /what we collect/i })` | heading   | section heading visible          | section visible | section missing |
| `getByRole('heading', { level: 2, name: /how we use it/i })`   | heading   | section heading visible          | section visible | section missing |
| `getByRole('heading', { level: 2, name: /sharing/i })`         | heading   | section heading visible          | section visible | section missing |
| `getByRole('heading', { level: 2, name: /control/i })`         | heading   | section heading visible          | section visible | section missing |
| `getByRole('paragraph')` (multiple)                            | paragraph | renders the body copy            | ≥4 paragraphs   | < 4 paragraphs  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                              | method | path | what request body or query is expected |
| ------------------------------------ | ------ | ---- | -------------------------------------- |
| (none) — static markup, no API calls |        |      |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/19-privacy.spec.ts`
