# Page observations: /bookmarks (Bookmarks)

> Authenticated saved-threads list. Loads `/api/bookmarks-rich` and
> renders ThreadRow groups by folder. Each row has an `Unsave`
> button on the right that DELETEs `/api/bookmarks/:id` and
> optimistically drops the row.

## Page state assumed

- [x] Authenticated; tested by bookmarking a thread first.

## Elements

| selector / accessible name                         | role         | expected behavior on interaction               | success signal              | failure signal                 |
| -------------------------------------------------- | ------------ | ---------------------------------------------- | --------------------------- | ------------------------------ |
| heading "Saved threads" eyebrow + h1               | text/heading | localized copy renders                         | text visible                | shows raw `{{key}}`            |
| empty state                                        | n/a          | "You haven't saved any threads yet…" when none | text visible                | infinite spinner               |
| populated state                                    | n/a          | a thread the user just bookmarked is visible   | thread title rendered       | row missing                    |
| folder group heading                               | text         | each folder name renders above its rows        | "Saved" group label visible | rows rendered without grouping |
| `getByRole('button', { name: /Unsave/i }).first()` | button       | DELETE /api/bookmarks/:id → optimistic remove  | the row is gone after click | row stays                      |
| ThreadRow link inside group                        | link         | navigates to /t/:slug-or-id                    | url matches `/t/...`        | link missing                   |
| reload after unsave                                | n/a          | the unsaved thread does NOT reappear           | row absent after reload     | row reappears                  |

## Network calls expected during normal use

| trigger      | method | path                  | what request body or query is expected                    |
| ------------ | ------ | --------------------- | --------------------------------------------------------- |
| route load   | GET    | `/api/bookmarks-rich` | 200 with `{ data: [{ thread: {...}, folder: 'Saved' }] }` |
| Unsave click | DELETE | `/api/bookmarks/:id`  | 204 / 200                                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookmarks.spec.ts`
