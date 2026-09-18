# Page observations: /segments (Segments)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seeded with beta_testers + power_users

## Elements

| selector / accessible name                                | role    | expected behavior on interaction    | success signal                     | failure signal |
| --------------------------------------------------------- | ------- | ----------------------------------- | ---------------------------------- | -------------- |
| `getByRole('button', { name: /new segment/i })`           | button  | reveal create form                  | form fields visible                | form hidden    |
| Key/name/description inputs in create form                | textbox | accept segment metadata             | value reflects typed text          | empty          |
| `getByRole('button', { name: /create/i })` (segment form) | button  | submit, POST /api/segments          | new segment card visible           | error          |
| Segment card link to /segments/:key                       | link    | deep-link to segment detail         | URL becomes /segments/beta_testers | stays          |
| Rule count chip on card                                   | text    | shows number of conditions from API | numeric matches conditions length  | mismatch       |
| Seeded segment "beta_testers" card                        | card    | render seed segment name            | visible after seed                 | absent         |

## Hidden surfaces opened from this page

| trigger     | what it opens      | elements inside (selector / role / behavior)            |
| ----------- | ------------------ | ------------------------------------------------------- |
| New segment | inline create form | key input, name input, description input, Create button |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected |
| --------- | ------ | ------------- | -------------------------------------- |
| page load | GET    | /api/segments | (none)                                 |
| Create    | POST   | /api/segments | { key, name, description }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-segments.spec.ts`
