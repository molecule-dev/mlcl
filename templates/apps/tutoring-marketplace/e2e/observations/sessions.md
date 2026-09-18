# Page observations: /sessions (Sessions)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                     | role         | expected behavior on interaction    | success signal           | failure signal     |
| ---------------------------------------------- | ------------ | ----------------------------------- | ------------------------ | ------------------ |
| heading "Every lesson, in one place."          | heading      | page header                         | visible                  | missing            |
| `getByRole('button', { name: /^upcoming$/i })` | button (tab) | filters list to upcoming bookings   | tab aria-selected/active | inert              |
| `getByRole('button', { name: /^past$/i })`     | button (tab) | filters list to completed/cancelled | tab toggles              | inert              |
| `getByRole('button', { name: /^all$/i })`      | button (tab) | shows all bookings                  | tab toggles              | inert              |
| Session card row                               | link         | navigates to /sessions/:id          | URL contains /sessions/  | nav fails          |
| Empty-state copy "Nothing scheduled here yet." | text         | shown when list empty               | visible for fresh user   | missing when empty |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                             | what request body or query is expected |
| --------- | ------ | -------------------------------- | -------------------------------------- |
| page load | GET    | /api/bookings/student/:studentId | returns logged-in student's bookings   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sessions.spec.ts`
