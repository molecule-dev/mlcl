# Page observations: /image-generator (ImageGenerator)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction                                                | success signal                                                                                                      | failure signal                                          |
| ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `getByRole('heading', { name: /AI Image Generator/i, level: 1 })` | heading | page title renders                                                              | h1 visible                                                                                                          | h1 missing                                              |
| `getByRole('textbox')` (prompt textarea)                          | textbox | accepts prompt text                                                             | textarea retains value                                                                                              | input not editable                                      |
| `getByRole('button', { name: /Generate Image/i })`                | button  | calls POST /api/images/generate with the prompt and renders the resulting image | `<img>` appears with a real, non-blank URL (`oaidalleapi*` or `/api/images/`); request returned 200 with `data.url` | response 5xx OR `data.url` empty OR no `<img>` rendered |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                 | what request body or query is expected                                                |
| -------------------- | ------ | -------------------- | ------------------------------------------------------------------------------------- |
| Generate Image click | POST   | /api/images/generate | `{ prompt, size: '1024x1024' }` → 200 with `{ url, revisedPrompt }` (real DALL-E URL) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/image-generator.spec.ts`
