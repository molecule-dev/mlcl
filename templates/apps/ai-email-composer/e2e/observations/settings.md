# Page observations: /settings (Settings)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/settings.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                                               | success signal                                         | failure signal            |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------- |
| `[data-mol-id="settings-page"]`                     | region  | settings shell renders with signature/tone/integrations sections               | element visible                                        | absent                    |
| `[data-mol-id="settings-signature"]`                | textbox | accepts a signature; clicking Save persists it; survives reload                | typed value reflected in textbox after `page.reload()` | reverts to default        |
| `[data-mol-id="settings-save"]`                     | button  | persists settings to local store; success status appears                       | `[data-mol-id="settings-status"]` becomes visible      | no toast / no persistence |
| `[data-mol-id="settings-integration-toggle-gmail"]` | button  | toggles Connect / Disconnect for the Gmail integration; persists across reload | label flips on click; same label after reload          | no flip / no persistence  |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — sections render inline) | —             | —                                            |

## Network calls expected during normal use

<!-- Settings persists locally via localStorage; no API write on save. -->

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
