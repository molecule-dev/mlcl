# Page observations: /terms

> Public terms-of-service.

## Page state assumed

- [x] Public

## Elements

| selector / accessible name           | role      | expected behavior on interaction | success signal | failure signal     |
| ------------------------------------ | --------- | -------------------------------- | -------------- | ------------------ |
| `getByRole("heading", { level: 1 })` | heading   | page heading visible             | visible        | empty              |
| `getByText(/terms                    | agreement | service/i)`                      | label          | terms-related copy | visible       | absent |
| `getByRole("link", { name: /home     | back      | landing/i })`                    | link           | nav back to /      | URL becomes / | stays  |

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
- [x] All elements above have a corresponding test in `e2e/22-terms.spec.ts`
