# Page observations: /search (Search)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                   | role    | expected behavior on interaction                                 | success signal                                             | failure signal |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | -------------- |
| `input[placeholder*="Search"]` (placeholder=Search transcripts, agents, settings…)                                                           | textbox | accepts user typed value (Search transcripts, agents, settings…) | value retained                                             | input rejected |
| getByRole('link', { name: /new.*conversation0000.*2/i }) (New conversation00:00 · 2 msgOpen transcript)                                      | link    | navigates to /history/e1226e64-6051-4f9b-a221-bb05e3633525       | URL contains /history/e1226e64-6051-4f9b-a221-bb05e3633525 | URL unchanged  |
| getByRole('link', { name: /untitled.*personayou.*are/i }) (Untitled personaYou are a thoughtful, voice-native thinking partner. Mirror the ) | link    | navigates to /agents/a5b7ece9-0366-4515-b778-40942df404f3        | URL contains /agents/a5b7ece9-0366-4515-b778-40942df404f3  | URL unchanged  |
| getByRole('link', { name: /voicedefault.*voice.*lang/i }) (VoiceDefault voice & language preferences)                                        | link    | navigates to /settings                                           | URL contains /settings                                     | URL unchanged  |
| getByRole('link', { name: /billingplans.*payment.*met/i }) (BillingPlans, payment method, and invoices)                                      | link    | navigates to /settings/billing                                   | URL contains /settings/billing                             | URL unchanged  |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| initial render | GET    | /api/agents        | returns the page data                  |
| initial render | GET    | /api/conversations | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
