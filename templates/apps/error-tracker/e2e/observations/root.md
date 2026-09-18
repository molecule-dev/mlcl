# Page observations: / (Faultline marketing landing)

> Anonymous landing page for Faultline (error-tracker). Has CTAs into /signup + /login + the live-issues hero block.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name                   | role       | expected behavior on interaction         | success signal      | failure signal |
| -------------------------------------------- | ---------- | ---------------------------------------- | ------------------- | -------------- |
| `getByRole("link", { name: /start free/i })` | link       | navigates to /signup                     | URL becomes /signup | stays on /     |
| `getByRole("link", { name: /sign in/i })`    | link       | navigates to /login                      | URL becomes /login  | stays on /     |
| `page.getByRole("heading", { level: 1 })`    | heading    | renders "Catch what breaks." headline    | visible h1          | empty body     |
| `page.locator("nav")`                        | navigation | renders the top navbar with brand + CTAs | visible             | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

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
- [x] All elements above have a corresponding test in the matching e2e/<n>-root.spec.ts
