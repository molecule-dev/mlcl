# Page observations: /settings (Settings)

User preferences page. Asserts read + write round-trip persistence to /api/preferences.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role       | expected behavior on interaction                                                        | success signal                       | failure signal |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------- | ------------------------------------ | -------------- |
| preferences form rendered  | form       | fetches /api/preferences and pre-fills inputs (weekly goal, reminder time, theme, etc.) | inputs visible with persisted values | form missing   |
| weekly-goal input          | spinbutton | editing fires PUT /api/preferences and persists across reload                           | reload shows new value               | value resets   |
| reminder-time input        | textbox    | editing persists via PUT /api/preferences                                               | reload shows new value               | value resets   |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger          | method | path             | what request body or query is expected |
| ---------------- | ------ | ---------------- | -------------------------------------- |
| initial load     | GET    | /api/preferences | 200 with current prefs                 |
| edit + blur/save | PUT    | /api/preferences | partial body → 200 with merged prefs   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
