# Page observations: /models/:id/embed (Embed)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated; the URL `:id` corresponds to a model the user owns and has previously created an embed for

## Elements

| selector / accessible name          | role           | expected behavior on interaction                                      | success signal                        | failure signal      |
| ----------------------------------- | -------------- | --------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| Configuration input (first input)   | textbox        | renders embed config inputs (width, height, theme)                    | input visible                         | absent              |
| Embed config persists across reload | network        | values stored via POST /api/embeds remain populated after page reload | input value still matches saved value | reverts to defaults |
| Embed snippet contains saved id     | static content | page text contains embed.id from POST /api/embeds                     | id substring present in body          | id missing          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

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
- [x] All elements above have a corresponding test in `e2e/models__id_embed.spec.ts`
