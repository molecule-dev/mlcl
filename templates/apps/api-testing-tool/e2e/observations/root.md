# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role | expected behavior on interaction                       | success signal                        | failure signal            |
| ------------------------------------------------------- | ---- | ------------------------------------------------------ | ------------------------------------- | ------------------------- |
| `getByRole('link', { name: /^Pylon\.$/i })`             | link | nav-bar brand link returns to `/` (anchored to `#top`) | `page.url()` ends with `/` or `/#top` | URL changed away from `/` |
| `getByRole('link', { name: /Sign in/i })`               | link | nav "Sign in" → `/login`                               | URL contains `/login`                 | stays on `/`              |
| `getByRole('link', { name: /Start free/i }).first()`    | link | nav CTA → `/signup`                                    | URL contains `/signup`                | stays on `/`              |
| `getByRole('link', { name: /Download free/i }).first()` | link | hero CTA → `/signup`                                   | URL contains `/signup`                | stays on `/`              |
| `getByRole('link', { name: /See plans/i })`             | link | hero secondary CTA → `/pricing`                        | URL contains `/pricing`               | stays on `/`              |
| `getByRole('link', { name: /Choose plan/i }).first()`   | link | pricing-card CTA → `/signup` (Community/free row)      | URL contains `/signup`                | stays on `/`              |

## Hidden surfaces opened from this page

| trigger                              | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------ | ------------- | -------------------------------------------- |
| (none — landing has no menus/modals) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected                                         |
| --------- | ------ | --------------------- | ------------------------------------------------------------------------------ |
| Page load | GET    | / (vite static asset) | served by Vite — observed via `captureNetwork` so we know HTML actually loaded |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
