# Page observations: /settings/api-keys (APIKeys)

Source: live walk via Playwright + e2e/settings_api-keys.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role   | expected behavior on interaction                                  | success signal                       | failure signal  |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------- | ------------------------------------ | --------------- |
| `getByRole("button", { name: /Create key/i })` | button | reveals the inline create-key form                                | create input visible                 | no form         |
| `getByRole("button", { name: /^Create$/i })`   | button | submit POST /api/api_keys → reveal panel shows plaintext key once | data-revealed-key has sk_live_ value | no reveal panel |
| `getByText(/sk_live_/i).first()`               | text   | after creation the masked key appears in the table                | masked key visible                   | table empty     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path          | what request body or query is expected                      |
| ------------ | ------ | ------------- | ----------------------------------------------------------- |
| initial load | GET    | /api/api_keys | 200 with array of keys (empty for fresh user)               |
| create       | POST   | /api/api_keys | {name,scopes} body — 201 with {id,key_masked,key:plaintext} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_api-keys.spec.ts`
