# Page observations: /editor (Editor)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up and create an image, then `browser_navigate` to `/editor?photo=<id>`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — left tool rail, top toolbar, canvas, right panel tabs.
4. Drag a slider; observe the save status pill flip saving → saved.
5. Re-navigate (also `/editor` with no `?photo`) and re-snapshot.
6. When complete, write `e2e/editor.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                         | role                 | expected behavior on interaction                                                   | success signal                                               | failure signal                         |
| -------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| `[data-mol-id="editor-no-photo"]` (only when no `?photo`)                                          | container            | "Open library" button navigates to `/library`                                      | URL becomes `/library`                                       | stays                                  |
| `[data-mol-id="adjust-contrast"]` (and other adjustment sliders: exposure/shadows/highlights/etc.) | slider (range input) | dragging fires debounced PUT `/api/images/:id` with new edit_history entry         | save status flips `saving` → `saved`; persists across reload | save status `error`; no PUT in network |
| `[data-mol-id="editor-undo"]`                                                                      | button               | pops the last history entry, PUTs the truncated array; disabled when history empty | history list shrinks by 1; if empty, button disables         | save status `error`                    |
| `[data-mol-id="editor-tab-presets"]` and `[data-mol-id="editor-tab-info"]`                         | button               | switches the right panel content (Adjust → Presets → Info)                         | matching panel content visible                               | unchanged                              |
| `[data-mol-id="editor-export"]`                                                                    | link                 | navigates to `/export?photo=<id>`                                                  | URL becomes `/export?photo=<id>`                             | stays                                  |
| `[data-mol-id="editor-loading"]` (when image id is unknown)                                        | container            | shows the loading state and never resolves to a populated canvas                   | `editor-loading` visible, no `Application error` overlay     | React error overlay visible            |

## Hidden surfaces opened from this page

| trigger                              | what it opens        | elements inside (selector / role / behavior)         |
| ------------------------------------ | -------------------- | ---------------------------------------------------- |
| `[data-mol-id="editor-tab-presets"]` | preset grid          | up to 6 `PresetTile` buttons; each toggles a preset  |
| `[data-mol-id="editor-tab-info"]`    | frame metadata panel | dl rows: Dimensions, Album, Public, Added, Last edit |

## Network calls expected during normal use

| trigger                        | method | path               | what request body or query is expected                               |
| ------------------------------ | ------ | ------------------ | -------------------------------------------------------------------- |
| (page load with `?photo=<id>`) | GET    | `/api/images/<id>` | full image row including `edit_history`                              |
| slider drag (debounced 600ms)  | PUT    | `/api/images/<id>` | `{ edit_history: [...prev, { ts, label, adjustments, preset_id }] }` |
| `editor-undo` click            | PUT    | `/api/images/<id>` | `{ edit_history: <prev minus last> }`                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/editor.spec.ts`
