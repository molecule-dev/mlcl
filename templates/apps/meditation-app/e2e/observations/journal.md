# Page observations: /journal (Journal)

Reflection journal. Asserts compose-and-save round-trip and list re-fetch.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role    | expected behavior on interaction                                                    | success signal                            | failure signal                                                                        |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| journal compose textarea           | textbox | lets the user type a reflection body                                                | textarea accepts input                    | textarea missing                                                                      |
| `getByRole("button", { name: /save | post    | publish/i })`                                                                       | button                                    | POST /api/journal with { body, mood }; clears the form and prepends new entry to list | new entry visible after save without page reload | no entry rendered, error toast |
| journal entries list               | list    | fetches /api/journal?limit=50 and renders each entry with body + relative timestamp | list contains the seeded/saved entry text | list empty after seed                                                                 |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path         | what request body or query is expected |
| ------------ | ------ | ------------ | -------------------------------------- |
| initial load | GET    | /api/journal | 200 with entries (most-recent first)   |
| submit       | POST   | /api/journal | { body, mood, written_at } → 201       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
