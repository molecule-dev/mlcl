# Page observations: /home (Navigate → /c)

> Authenticated convenience alias. The route element is `<Navigate
to="/c" replace />` so the only observable behavior is "GET /home
> ends on /c with the categories list rendered".

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name  | role | expected behavior on interaction          | success signal                 | failure signal                                        |
| --------------------------- | ---- | ----------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| navigate to /home           | n/a  | redirected to /c                          | `page.url()` ends with `/c`    | url stays `/home`                                     |
| categories list visible     | list | the rendered page contains the agora hero | text "Pick a room" visible     | empty page or 404                                     |
| browser back after redirect | n/a  | history records ONE entry (replace)       | back leaves the app, not /home | back returns to /home (would create an infinite loop) |

## Network calls expected during normal use

| trigger        | method | path                   | what request body or query is expected |
| -------------- | ------ | ---------------------- | -------------------------------------- |
| after redirect | GET    | `/api/categories-rich` | 200 with rich category list            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/home.spec.ts`
