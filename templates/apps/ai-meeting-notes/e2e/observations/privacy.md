# Page observations: /privacy (Privacy Policy)

> Public — long-form policy page rendering the published Murmur privacy
> policy. Sections cover data collection, usage, sharing, controls, and
> contact info.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role           | expected behavior on interaction | success signal                         | failure signal  |
| ---------------------------------------------------- | -------------- | -------------------------------- | -------------------------------------- | --------------- |
| `page.locator('[data-mol-id="page-privacy"]')`       | container      | wraps the entire policy body     | element visible                        | missing root    |
| `getByRole('heading', { name: /privacy policy/i })`  | heading        | top-of-page identifier           | h1 visible                             | empty page      |
| `getByRole('heading', { name: /what we collect/i })` | heading        | data-collection section          | h2 visible                             | section missing |
| `getByRole('heading', { name: /how we use it/i })`   | heading        | usage section                    | h2 visible                             | section missing |
| `getByText(/openai                                   | whisper        | anthropic                        | claude/i)`                             | text            | enumerates upstream providers | text visible | provider list missing |
| `getByText(/audio                                    | transcript/i)` | text                             | covers handling of audio + transcripts | text visible    | data list missing             |
| `getByRole('heading', { name: /contact/i })`         | heading        | privacy@ contact section         | h2 visible                             | section missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

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
- [x] All elements above have a corresponding test in `e2e/06-privacy.spec.ts`
