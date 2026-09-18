# Page observations: / (Landing)

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name               | role | expected behavior on interaction          | success signal          | failure signal  |
| ---------------------------------------- | ---- | ----------------------------------------- | ----------------------- | --------------- |
| `page.goto("/")`                         | page | public landing renders body and CTA links | body not empty          | blank/404       |
| `a[href="/signup"]` / `a[href="/login"]` | link | navigates to signup/login                 | URL changes accordingly | no auth links   |
| `page.goto("/signup")`                   | page | signup is reachable from the landing      | lands on /signup        | redirected away |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

No backend calls are made during normal page load.

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
