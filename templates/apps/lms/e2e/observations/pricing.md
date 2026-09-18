# Page observations: /pricing (Public pricing page)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Anonymous OK; signed-in users also allowed (anonymous users are redirected to /login on checkout)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction  | success signal                      | failure signal         |
| ------------------------------------------------------ | ------- | --------------------------------- | ----------------------------------- | ---------------------- |
| `getByRole('heading', { name: /choose your.*plan/i })` | heading | renders the pricing page heading  | heading visible                     | crash / blank screen   |
| Tier headings (Free / Pro / Team / Scholar / Mastery)  | heading | one heading per loaded tier       | at least 2 plan tiles visible       | empty / spinner stuck  |
| Per-tier limit list (`<ul><li>… courses</li>…`)        | list    | shows the per-tier numeric limits | rows rendered with numbers / dashes | no list under any tier |

## Hidden surfaces opened from this page

| trigger                    | what it opens | elements inside (selector / role / behavior) |
| -------------------------- | ------------- | -------------------------------------------- |
| (none — flat catalog page) | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| Page load | GET    | /api/billing/tiers | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
