# Page observations: /clips (Clips)

Source: live walk via Playwright + e2e/clips.spec.ts. Two-pane main
app surface — a filter+list on the left and a detail pane on the
right. Empty-state for new accounts. New-clip form lives at the top
of the list pane and accepts a textarea + a "mark sensitive"
checkbox. Detail pane exposes copy / pin / encrypt-toggle / delete.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role     | expected behavior on interaction                           | success signal                              | failure signal  |
| --------------------------------------------------------------- | -------- | ---------------------------------------------------------- | ------------------------------------------- | --------------- |
| Empty-state copy `Nothing yanked yet…`                          | text     | rendered for new account                                   | visible                                     | missing         |
| Initial fetch GET /api/clips                                    | network  | fires on first paint                                       | 200 in network capture                      | no fetch        |
| Seeded clip preview row                                         | listitem | renders preview text in the list                           | visible                                     | missing         |
| `New clip` toggle + `[data-mol-id="clip-new-content"]` textarea | button   | reveals form with textarea                                 | textarea visible after click                | no change       |
| `Save clip` submit (POST /api/clips)                            | button   | persists clip with read-after-write                        | new row visible in list                     | row missing     |
| Sensitive-clip create stores ciphertext (preview masked)        | form     | clip with `is_sensitive=true` returns content=null in list | content null + preview masked               | plaintext leaks |
| `button[aria-label*=Pin]` (detail pane)                         | button   | POST /clips/:id/pin toggles row + lifts to Pinned section  | Pinned heading visible + row in /api/pinned | no change       |
| `button[aria-label*=Delete]` (detail pane)                      | button   | DELETE /clips/:id removes row + DB record                  | row gone + GET /:id returns 404             | row remains     |
| Filter input (`type=search`)                                    | textbox  | client-side filters previews + titles                      | matching rows visible, others hidden        | filter ignored  |

## Hidden surfaces opened from this page

| trigger           | what it opens             | elements inside (selector / role / behavior) |
| ----------------- | ------------------------- | -------------------------------------------- |
| `New clip` button | inline form (top of list) | textarea + checkbox + submit                 |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| initial load   | GET    | /api/clips         | 200 with array of clip rows            |
| save form      | POST   | /api/clips         | `{content, is_sensitive}` → 201        |
| toggle pin     | POST   | /api/clips/:id/pin | `{}` → 200 with `{is_pinned: bool}`    |
| toggle encrypt | PATCH  | /api/clips/:id     | `{content, is_sensitive}` → 200        |
| delete         | DELETE | /api/clips/:id     | → 204                                  |

## Coverage check (final pass)

- [x] Navigated, snapshotted, listed, then re-navigated
- [x] Empty-state observed
- [x] Form: every field documented (textarea, checkbox, submit)
- [x] All four detail-pane action buttons exercised
- [x] Filter input narrowing tested
- [x] Read-after-write tested for create + pin + delete + encrypt
- [x] All elements above have a corresponding test in `e2e/clips.spec.ts`
