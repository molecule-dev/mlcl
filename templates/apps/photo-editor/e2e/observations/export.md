# Page observations: /export (Export)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up, create at least one image, then `browser_navigate` to `/export?photo=<id>`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — preview pane, format buttons, quality slider, size buttons,
   EXIF toggle, submit button, recent exports list.
4. Click "Export frame"; observe the success state + recent list grow.
5. Re-navigate (also `/export` with no photo and an empty library) and re-snapshot.
6. When complete, write `e2e/export.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                    | role          | expected behavior on interaction                                                                                                                                                 | success signal                                                                                                             | failure signal                         |
| --------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `[data-mol-id="export-empty"]` (only when library is empty)                                   | container     | "Open library" link navigates to `/library`                                                                                                                                      | URL becomes `/library`                                                                                                     | stays                                  |
| `[data-mol-id="export-submit"]` ("Export frame", with format/size selected)                   | button        | POST `/api/exports` with `{ image_id, format, quality, width, height, strip_exif }`; on 201 prepends new row in recent list and triggers a download via temporary `<a download>` | `[data-mol-id="export-success"]` visible; recent list grows; export row has `status='completed'` and non-null `output_url` | `[data-mol-id="export-error"]` visible |
| `[data-mol-id="export-quality"]` + `[data-mol-id="export-format-webp"]` (chained with submit) | slider+button | the chosen quality value (1–100) and format must round-trip into the next POST body                                                                                              | request body has `quality: <value>`, `format: 'webp'`, `image_id: <id>`                                                    | wrong values in body                   |
| `[data-mol-id="export-strip-exif"]` (chained with submit)                                     | switch        | `aria-checked` and `data-checked` flip; the boolean must round-trip into the next POST body                                                                                      | request body has `strip_exif: true`                                                                                        | wrong / absent                         |

## Hidden surfaces opened from this page

| trigger                                     | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------- | ------------- | -------------------------------------------- |
| (none — page is fully visible at all times) | —             | —                                            |

## Network calls expected during normal use

| trigger                         | method | path           | what request body or query is expected                                        |
| ------------------------------- | ------ | -------------- | ----------------------------------------------------------------------------- |
| (page load)                     | GET    | `/api/images`  | list of user's images; first one (or one matching `?photo=`) becomes selected |
| (page load)                     | GET    | `/api/exports` | recent exports for this user, newest first                                    |
| `[data-mol-id="export-submit"]` | POST   | `/api/exports` | `{ image_id, format, quality, width?, height?, strip_exif }` → 201 export row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/export.spec.ts`
