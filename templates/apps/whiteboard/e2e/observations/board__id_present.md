# Page observations: /board/:id/present (Presentation mode)

> Authenticated full-screen frame deck for the board. Empty-state with
> an "Add first frame" CTA when zero frames exist; otherwise the
> currently-selected frame is rendered with prev/next nav and a dot
> pagination row, plus an exit link back to `/board/:id`. Frame
> creation POSTs to /api/frames/:boardId.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                                                 | role      | expected behavior on interaction                                                                                                                                                                                                 | success signal                                                                | failure signal                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| empty-state → add first frame composer (`present-empty` → `present-add-first` → `present-add-form` → `present-frame-name` + `present-frame-body` → `present-frame-submit`) | composite | for a board with zero frames, the empty-state and "Add first frame" CTA are visible; clicking reveals the form, filling name/body and submitting POSTs /api/frames/:boardId so GET /frames/:boardId now contains the named frame | empty visible, form opens after click, submit lands the frame in GET response | any one missing or DB unchanged |
| multi-frame deck (`present-frame` + `present-prev` + `present-next` + `present-dot-{n}`)                                                                                   | composite | seeded multi-frame board renders the current frame name; prev/next swap to neighbors; dot pagination has one dot per frame and jumps to that index when clicked                                                                  | first/next/prev all swap correctly, dot count = frame count                   | unchanged on click              |
| `[data-mol-id="present-exit"]`                                                                                                                                             | link      | nav back to /board/:id                                                                                                                                                                                                           | URL becomes /board/:id                                                        | stays on /present               |

## Hidden surfaces opened from this page

| trigger                             | what it opens  | elements inside                            |
| ----------------------------------- | -------------- | ------------------------------------------ |
| `[data-mol-id="present-add-first"]` | new-frame form | name textbox, body textarea, submit button |

## Network calls expected during normal use

| trigger          | method | path                 | what request body or query is expected         |
| ---------------- | ------ | -------------------- | ---------------------------------------------- |
| page load        | GET    | /api/frames/:boardId | 200 array of frames (ordered by `order_index`) |
| Add frame submit | POST   | /api/frames/:boardId | `{ name, viewport, order_index? }`; 2xx        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/board__id_present.spec.ts`
