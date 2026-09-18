# Page observations: / (Embark marketing landing)

> Anonymous landing for Embark. Hero, CTAs to /signup and /login, theme toggle.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name                       | role   | expected behavior on interaction | success signal                 | failure signal          |
| ------------------------------------------------ | ------ | -------------------------------- | ------------------------------ | ----------------------- |
| `getByRole("button", { name: /Toggle theme/i })` | button | triggers the Toggle theme action | expected DOM update / API call | no change / error toast |
| `getByRole("link", { name: /Sign in/i })`        | link   | navigates to /login              | URL becomes /login             | stays on current route  |
| `getByRole("link", { name: /Get started/i })`    | link   | navigates to /signup             | URL becomes /signup            | stays on current route  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |
|         |        |      |               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
