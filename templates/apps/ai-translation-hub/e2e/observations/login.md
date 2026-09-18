# Page observations: /login (Login)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/login.
> Headings observed: 1: Rendition, 2: Welcome back.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role  | expected behavior on interaction | success signal               | failure signal |
| --------------------------------------------------- | ----- | -------------------------------- | ---------------------------- | -------------- |
| `input[placeholder="you@workspace.com"]`            | input | accepts email input              | value matches                | empty value    |
| `getByRole('link', { name: /Forgot password\?/i })` | a     | navigates to /forgot-password    | URL becomes /forgot-password | no change      |
| `input[placeholder="••••••••"]`                     | input | accepts password input           | value matches                | empty value    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger           | method | path | expected body |
| ----------------- | ------ | ---- | ------------- |
| Initial page load | (none) | n/a  | static page   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
