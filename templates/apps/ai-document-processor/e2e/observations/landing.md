# Page observations: / (Landing) — covered by 01-landing.spec.ts

> Public marketing page for Parcela. Two CTAs and a feature deck — no
> auth required, no API calls fired on load.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name              | role         | expected behavior on interaction | success signal | failure signal     |
| --------------------------------------- | ------------ | -------------------------------- | -------------- | ------------------ |
| `getByRole('heading', { level: 1 })`    | heading      | renders Parcela hero headline    | visible        | empty              |
| `getByRole('link', { name: /sign in     | log in/i })` | link                             | nav to /login  | URL becomes /login | stays               |
| `getByRole('link', { name: /get started | sign up      | start.*trial/i })`               | link           | nav to /signup     | URL becomes /signup | stays |
| `getByText(/upload/i).first()`          | text         | feature card mentions Upload     | text visible   | absent             |

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
- [x] All elements above have a corresponding test in `e2e/01-landing.spec.ts`
