# Page observations: /agent/:id (agent__id)

Agent profile page hydrated from /api/agents/:id and /api/agents/:id/listings.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal      | failure signal |
| -------------------------- | ------- | -------------------------------- | ------------------- | -------------- |
| agent name heading         | heading | show agent name from API         | heading visible     | missing        |
| agent bio text             | text    | show bio from API                | bio visible         | missing        |
| agent listings grid        | list    | show /api/agents/:id/listings    | list element exists | missing        |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path        | what request body or query is expected |
| --------- | ------ | ----------- | -------------------------------------- |
| page load | GET    | /api/agents | /:id → 200 agent + listings hydrated   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/agent__id.spec.ts`
