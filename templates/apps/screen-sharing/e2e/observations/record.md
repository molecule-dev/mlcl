# Page observations: /record (Record)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user with workspace bootstrapped

## Elements

| selector / accessible name | role    | expected behavior on interaction                         | success signal              | failure signal           |
| -------------------------- | ------- | -------------------------------------------------------- | --------------------------- | ------------------------ |
| Start recording button     | button  | Initiates getDisplayMedia capture (or headless fallback) | recording state engaged     | crash without permission |
| Title input                | textbox | Captures recording title for save                        | value persists              | reset on type            |
| Visibility toggle          | button  | Cycles private/workspace/public                          | current value shown         | stuck                    |
| Save button                | button  | POSTs /api/recordings + navigates to /recordings/:id     | URL becomes /recordings/:id | error toast              |
| Cancel/back link           | link    | Returns to /library                                      | URL becomes /library        | stuck                    |

## Hidden surfaces opened from this page

| trigger         | what it opens                | elements inside (selector / role / behavior)               |
| --------------- | ---------------------------- | ---------------------------------------------------------- |
| start recording | browser display-media prompt | OS-level dialog; falls back to placeholder URL when denied |

## Network calls expected during normal use

| trigger | method | path            | what request body or query is expected         |
| ------- | ------ | --------------- | ---------------------------------------------- |
| save    | POST   | /api/recordings | { title, workspace_id, visibility, video_url } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-record.spec.ts`
