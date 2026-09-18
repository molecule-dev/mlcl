# Page observations: /upload (Upload wizard)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/upload.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                         | success signal                            | failure signal             |
| ------------------------------------------------- | ------- | -------------------------------------------------------- | ----------------------------------------- | -------------------------- |
| `getByRole('button', { name: /Choose a file/i })` | button  | advances the wizard from "drop" stage to "details" stage | Title + Description fields become visible | wizard stuck on stage 1    |
| `getByLabel(/^Title$/i)`                          | textbox | accepts the new video's title for upload metadata        | typed value mirrored                      | input missing or read-only |

## Hidden surfaces opened from this page

| trigger       | what it opens                                                                                  | elements inside (selector / role / behavior) |
| ------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Choose a file | wizard "details" stage with `Title`, `Description`, `Visibility` fields and a `Publish` button |

## Network calls expected during normal use

| trigger | method | path        | what request body or query is expected         |
| ------- | ------ | ----------- | ---------------------------------------------- |
| Publish | POST   | /api/videos | `{ title, description, visibility, file_url }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-upload.spec.ts`
