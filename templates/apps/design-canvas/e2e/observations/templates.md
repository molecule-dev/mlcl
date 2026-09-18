# Page observations: /templates (Templates)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/templates`
2. browser_snapshot — hero card, category filter row, template grid, "Use template" buttons inside cards
3. After clicking a category button, the visible cards filter in place

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name                    | role    | expected behavior on interaction                                         | success signal                                  | failure signal  |
| --------------------------------------------- | ------- | ------------------------------------------------------------------------ | ----------------------------------------------- | --------------- |
| `getByRole('heading', { name: /Templates/ })` | heading | renders the page title                                                   | level-1 heading visible                         | heading missing |
| `getByRole('button', { name: /^All$/ })`      | button  | resets category filter to "all"                                          | grid shows all seeded templates                 | filter sticks   |
| `getByRole('button', { name: /UI Mockup/ })`  | button  | filters by `category === 'UI Mockup'`                                    | grid shows only UI Mockup cards                 | grid unchanged  |
| `getByRole('button', { name: /Branding/ })`   | button  | filters by `category === 'Branding'`                                     | grid narrows to Branding cards                  | grid unchanged  |
| `getByRole('button', { name: /Marketing/ })`  | button  | filters by `category === 'Marketing'`                                    | grid narrows to Marketing cards                 | grid unchanged  |
| `[data-mol-id="templates-grid"]`              | grid    | renders one card per template returned by `/api/templates`               | at least one `[data-mol-id^="template-"]` child | grid empty      |
| `[data-mol-id^="template-use-"]`              | button  | POSTs `/api/templates/:id/use` and navigates to the new project's editor | URL becomes `/editor/<uuid>`                    | URL stays       |

## Hidden surfaces opened from this page

| trigger      | what it opens                                | elements inside (selector / role / behavior) |
| ------------ | -------------------------------------------- | -------------------------------------------- |
| API failure  | `[data-mol-id="templates-error"]` text block | shows the error message inline               |
| initial load | `[data-mol-id="templates-loading"]` text     | replaced by grid once response lands         |

## Network calls expected during normal use

| trigger              | method | path                     | what request body or query is expected          |
| -------------------- | ------ | ------------------------ | ----------------------------------------------- |
| initial render       | GET    | `/api/templates`         | bearer-authed; returns the seeded template list |
| "Use template" click | POST   | `/api/templates/:id/use` | empty body — server creates a new project       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/templates.spec.ts`
