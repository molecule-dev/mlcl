# Page observations: /moderation (ModerationQueue)

> Authenticated moderator workspace. GET /api/moderation/queue is
> 403 for non-moderators (the page renders the error/empty state).
> Filter chips switch between flag types. Each item exposes
> Approve / Hide / Lock / Ban actions that POST to
> `/api/moderation/:id/:action` (requires moderator role).

## Page state assumed

- [x] Authenticated; non-moderator users still get the page render
      but see the "Forbidden" / empty state.

## Elements

| selector / accessible name                | role    | expected behavior on interaction                | success signal                        | failure signal                   |
| ----------------------------------------- | ------- | ----------------------------------------------- | ------------------------------------- | -------------------------------- |
| heading "Moderation queue · N open items" | heading | renders with count                              | "0 open items" or N visible           | shows raw key                    |
| filter chip "All"                         | button  | shows full queue                                | counts pill present                   | filter unchanged                 |
| filter chip "Flags"                       | button  | shows flagged-post items only                   | empty for non-mods, filtered for mods | filter unchanged                 |
| filter chip "Pending"                     | button  | shows pending-thread items only                 | filter applies                        | unchanged                        |
| filter chip "Reports"                     | button  | shows reported-user items only                  | filter applies                        | unchanged                        |
| filter chip "Appeals"                     | button  | shows ban-appeal items only                     | filter applies                        | unchanged                        |
| empty state                               | n/a     | "Queue clear. Brew a tea." for non-mods         | text visible                          | renders ghost rows               |
| moderator-only API                        | n/a     | non-mod gets 403 from GET /moderation/queue     | 403 status surfaced as error/empty    | renders queue items for non-mods |
| approve action POST                       | n/a     | only allowed for mods; surface as `decision` UI | resolved label appears                | action silently fails for mods   |

## Network calls expected during normal use

| trigger      | method | path                          | what request body or query is expected             |
| ------------ | ------ | ----------------------------- | -------------------------------------------------- |
| route load   | GET    | `/api/moderation/queue`       | 200 (`{ data: [...] }`) for mods, 403 for non-mods |
| action click | POST   | `/api/moderation/:id/:action` | `{}` body returns 200 (mods) / 403 (others)        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/moderation.spec.ts`
