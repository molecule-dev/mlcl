# Page observations: /audit (AuditLog)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seed populates 5+ audit entries

## Elements

| selector / accessible name                              | role      | expected behavior on interaction   | success signal                | failure signal      |
| ------------------------------------------------------- | --------- | ---------------------------------- | ----------------------------- | ------------------- |
| `getByRole('heading', { name: /audit/i })`              | heading   | render audit log title             | visible                       | absent              |
| Free-text search input                                  | searchbox | filter entries by actor/target     | non-matching entries hidden   | unchanged           |
| Action filter chip ("created", "toggled", etc.)         | button    | client-side narrow visible entries | only matching entries visible | unchanged           |
| `getByRole('button', { name: /^all$/i })` (filter chip) | button    | restore all entries                | full list re-rendered         | filter still active |
| Audit entry list item with seed action                  | listitem  | renders actor + action + target    | visible                       | absent              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| page load | GET    | /api/audit-log | ?limit=200                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-audit.spec.ts`
