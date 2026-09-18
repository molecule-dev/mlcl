# Page observations: /meetings/:id (Meeting detail)

> Authenticated. Renders one meeting's full transcript on the left,
> AI summary + decisions + follow-ups in the top-right card, and action
> items below. Reachable from /dashboard cards or /meetings rows.

## Page state assumed

- [x] Authenticated AND a meeting exists for this user (seed via
      signup → POST /api/meetings/transcribe in tests, or manual
      POST /api/meetings)

## Elements

| selector / accessible name                   | role                     | expected behavior on interaction | success signal                    | failure signal           |
| -------------------------------------------- | ------------------------ | -------------------------------- | --------------------------------- | ------------------------ |
| `getByRole('link', { name: /all meetings     | back/i })`               | link                             | nav back to /dashboard            | URL becomes `/dashboard` | stays on `/meetings/:id` |
| `getByRole('heading', { level: 1 })`         | heading                  | renders the meeting title        | h1 visible with title             | empty heading            |
| `getByText(/transcript/i).first()`           | heading                  | transcript section heading       | section visible                   | section missing          |
| `getByText(/ai summary/i)`                   | heading                  | summary panel heading            | panel visible                     | panel missing            |
| `getByText(/decisions/i)`                    | heading                  | decisions sub-heading            | sub-section visible               | missing                  |
| `getByText(/follow-ups                       | action items/i).first()` | heading                          | follow-ups / action items section | visible                  | missing                  |
| `page.locator('[data-mol-id="nav-record"]')` | sidebar nav              | sidebar shell rendered           | element visible                   | layout broken            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path              | what request body or query is expected                                                          |
| --------- | ------ | ----------------- | ----------------------------------------------------------------------------------------------- |
| Page load | GET    | /api/meetings/:id | `{ title, recorded_at, transcript[], ai_tldr, ai_decisions[], ai_followups[], action_items[] }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-meetings__id.spec.ts`
