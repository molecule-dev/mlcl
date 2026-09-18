# Page observations: /board/:id/history (Version history)

> Authenticated. Lists every saved snapshot of a board in a timeline.
> Selecting an entry shows its `change_summary` in the detail panel;
> "Restore" replaces the board's elements with the snapshot's elements
> (POST /versions/:boardId/:versionId/restore) and routes back to the
> canvas. "Back" returns to the canvas without restoring.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                         | role        | expected behavior on interaction                                                                                                                                                                                                          | success signal                                                                                                                       | failure signal                  |
| -------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `[data-mol-id="version-empty"]`                                                                    | container   | empty-state copy when zero snapshots exist for this board                                                                                                                                                                                 | visible when zero snapshots                                                                                                          | hidden / errors                 |
| timeline → restore (`version-item-{id}` → `version-detail` → `version-restore` → `version-status`) | composite   | snapshots from API render in the timeline; clicking shows the change_summary in detail; "Restore" POSTs /versions/:boardId/:versionId/restore, replaces the board's elements with the snapshot's elements, then routes back to /board/:id | items visible, detail contains summary, status visible after click, GET /elements/:boardId reflects snapshot, URL becomes /board/:id | any one missing or DB unchanged |
| `[data-mol-id="version-back"]`                                                                     | link/button | nav back to /board/:id                                                                                                                                                                                                                    | URL becomes /board/:id                                                                                                               | stays on /history               |

## Hidden surfaces opened from this page

| trigger                                   | what it opens          | elements inside                           |
| ----------------------------------------- | ---------------------- | ----------------------------------------- |
| `[data-mol-id="version-item-{id}"]` click | detail panel populated | summary text, restore button, status text |

## Network calls expected during normal use

| trigger   | method | path                                      | what request body or query is expected     |
| --------- | ------ | ----------------------------------------- | ------------------------------------------ |
| page load | GET    | /api/versions/:boardId                    | 200 array of versions                      |
| Restore   | POST   | /api/versions/:boardId/:versionId/restore | 2xx; replaces board elements with snapshot |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/board__id_history.spec.ts`
