# Page observations: /recordings/:id (RecordingDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated user; recording exists and they have access

## Elements

| selector / accessible name | role    | expected behavior on interaction       | success signal                    | failure signal   |
| -------------------------- | ------- | -------------------------------------- | --------------------------------- | ---------------- |
| Recording title heading    | text    | Renders the recording title from API   | matches /api/recordings/:id title | mismatched/empty |
| HTML5 video player         | video   | Plays the recording's video_url        | metadata loads                    | broken element   |
| Replay/play/skip controls  | button  | Triggers play/pause/seek on the video  | state matches button              | inert            |
| Comment input              | textbox | Captures new comment content           | value persists                    | reset on type    |
| Comment submit             | button  | POSTs /api/comments/:recordingId       | comment appears in list           | toast error      |
| Existing comment row       | text    | Renders persisted comments             | content visible                   | missing          |
| Share link card            | text    | Shows /share/:token URL or share token | token rendered                    | missing          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path                       | what request body or query is expected |
| -------------- | ------ | -------------------------- | -------------------------------------- |
| page load      | GET    | /api/recordings/:id        | auth header only                       |
| page load      | GET    | /api/comments/:recordingId | auth header only                       |
| comment submit | POST   | /api/comments/:recordingId | { content, timestamp_ms }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-recordings__id.spec.ts`
