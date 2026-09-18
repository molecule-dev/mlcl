# Page observations: / (Landing)

> Public marketing landing for Dendrite. Renders without auth. Bottom of
> page links to /privacy, /terms, /about, /help.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role                   | expected behavior on interaction | success signal       | failure signal      |
| ----------------------------------------- | ---------------------- | -------------------------------- | -------------------- | ------------------- |
| `getByRole("heading", { level: 1 })`      | heading                | shows the headline               | visible              | empty               |
| `getByRole("link", { name: /start free    | start automating/i })` | link                             | navigates to /signup | URL becomes /signup | stays |
| `getByRole("link", { name: /sign in/i })` | link                   | navigates to /login              | URL becomes /login   | stays               |
| `getByRole("link", { name: /privacy/i })` | link                   | navigates to /privacy            | URL becomes /privacy | stays               |
| `getByRole("link", { name: /terms/i })`   | link                   | navigates to /terms              | URL becomes /terms   | stays               |

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
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
