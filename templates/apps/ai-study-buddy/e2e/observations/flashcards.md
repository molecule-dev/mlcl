# Page observations: /flashcards (Flashcard decks list)

Captured via `node scripts/observe-page.mjs ai-study-buddy /flashcards --auth`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role      | expected behavior on interaction              | success signal                | failure signal         |
| --------------------------------------- | --------- | --------------------------------------------- | ----------------------------- | ---------------------- |
| `[data-mol-id="page-flashcards"]`       | container | top-level wrapper renders                     | element visible               | redirected to `/login` |
| `[data-mol-id="flashcards-new"]`        | button    | reveals the "new deck" form                   | `flashcards-new-form` visible | form stays hidden      |
| `[data-mol-id="flashcards-new-name"]`   | textbox   | required name field for new deck              | input accepts text            | input missing          |
| `[data-mol-id="flashcards-new-submit"]` | button    | POSTs `/api/decks`, appends new tile          | tile with new name appears    | error / 4xx            |
| `[data-mol-id="flashcards-deck-link"]`  | link      | one per deck — navigates to `/flashcards/:id` | URL becomes /flashcards/:id   | stays                  |
| `[data-mol-id="flashcards-empty"]`      | container | empty state for new users                     | visible when 0 decks          | no empty state         |

## Hidden surfaces opened from this page

| trigger                | what it opens        | elements inside (selector / role / behavior) |
| ---------------------- | -------------------- | -------------------------------------------- |
| `flashcards-new` click | inline new-deck form | name input + submit button                   |

## Network calls expected during normal use

| trigger              | method | path         | what request body or query is expected |
| -------------------- | ------ | ------------ | -------------------------------------- |
| page mount           | GET    | `/api/decks` | array of user's decks                  |
| Submit new-deck form | POST   | `/api/decks` | `{ name, description?, topic_id? }`    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/21-flashcards.spec.ts`
