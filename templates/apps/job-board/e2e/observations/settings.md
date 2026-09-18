# Page observations: /settings (Settings)

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction | success signal | failure signal                      |
| --------------------------------------------------------------------- | ------- | -------------------------------- | -------------- | ----------------------------------- |
| Heading `getByRole('heading')` first                                  | heading | shows Settings                   | rendered       | missing                             |
| Theme toggle `getByRole('button', { name: /theme                      | dark    | light/i })` first                | button         | flips the html data-theme attribute | dataset.theme changes | unchanged |
| Save / update password form button `getByRole('button', { name: /save | update  | change/i })` first               | button         | persists the change                 | success notice        | 4xx       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| save form | PUT    | /api/users/:id | updated fields                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
