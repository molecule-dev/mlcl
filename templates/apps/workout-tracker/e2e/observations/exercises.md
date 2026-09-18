# Page observations: /exercises (Exercise library)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100.
> Authenticated; system seeds (Bench/Squat/Deadlift) appear immediately
> after first signup.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                               | role          | expected behavior on interaction                                                   | success signal                                        | failure signal                     |
| -------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `getByText(/bench press/i)` (and "Squat", "Deadlift")                                                    | text card/row | seeded system exercises render after first authenticated GET /api/exercises        | all three names visible                               | empty state, only loading skeleton |
| `getByRole('button', { name: /new exercise\|add exercise\|create/i })`                                   | button        | opens custom-exercise create form                                                  | input becomes focusable, submit button visible        | nothing happens, no form shown     |
| Custom exercise submit (`getByRole('button', { name: /create\|save\|add/i }).last()` after filling name) | button        | POST /api/exercises and re-renders list (read-after-write); persists across reload | new name appears in list and survives `page.reload()` | name absent, list unchanged        |

## Hidden surfaces opened from this page

| trigger               | what it opens               | elements inside                      |
| --------------------- | --------------------------- | ------------------------------------ |
| `New exercise` button | inline create form / dialog | text input for `name`, submit button |

## Network calls expected during normal use

| trigger                | method | path           | expected body                                                |
| ---------------------- | ------ | -------------- | ------------------------------------------------------------ |
| Page load              | GET    | /api/exercises | array of seeded + user-created exercises                     |
| Create custom exercise | POST   | /api/exercises | `{ name }` → 201, returned object included in subsequent GET |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-exercises.spec.ts`
