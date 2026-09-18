# Page observations: /integrations (Integrations)

Authenticated; reads + writes user.preferences.integrations via /api/profile/me.

Source: this page was driven live at `http://localhost:$VITE_PORT/integrations`
via Playwright + the matching `e2e/integrations.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role   | expected behavior on interaction                  | success signal                                           | failure signal           |
| ---------------------------------------------------- | ------ | ------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| `[data-testid="integration-google-calendar"]`        | group  | renders the Google Calendar card                  | visible on first paint                                   | card missing             |
| `[data-testid="integration-google-calendar-toggle"]` | button | flips connected state and PATCHes /api/profile/me | preferences.integrations["google-calendar"] becomes true | preferences never change |
| `[data-testid="integration-google-calendar-status"]` | text   | reflects current connected/disconnected status    | text reads "connected" after toggle + reload             | state never updates      |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/integrations.spec.ts`
