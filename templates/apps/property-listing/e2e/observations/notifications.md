# Page observations: /notifications (notifications)

In-app notifications inbox for the agent.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role       | expected behavior on interaction | success signal       | failure signal |
| -------------------------- | ---------- | -------------------------------- | -------------------- | -------------- |
| notifications heading      | heading    | static heading                   | heading visible      | missing        |
| notification list          | list       | list rendered (may be empty)     | list element present | missing        |
| navigation header          | navigation | global nav visible               | nav present          | missing        |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

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
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
