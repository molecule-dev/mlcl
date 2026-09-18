# Page observations: /events/:name (EventDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated. The `:id` path-param is actually the event **name** (the
      Events list page links via `/events/${encodeURIComponent(event.name)}`),
      so anywhere here that says `:id`, it means the event name.

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                 | success signal          | failure signal       |
| --------------------------------------------------------- | ------- | ------------------------------------------------ | ----------------------- | -------------------- |
| Event-name heading (`getByRole('heading', { level: 1 })`) | heading | renders the URL-param event name as h1           | matches the URL segment | wrong text / missing |
| Event-history fetch                                       | network | GET /api/events?name=…&limit=200 fires on render | response 200            | request not made     |
| Uncataloged event handling                                | text    | unknown name still renders heading + shell       | shell visible, no 5xx   | crash / blank shell  |
| `getByRole('link', { name: /^events$/i })`                | link    | navigate to `/events`                            | URL becomes `/events`   | stays                |

## Hidden surfaces opened from this page

| trigger                | what it opens           | elements inside (selector / role / behavior)     |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| Fire test event button | inline status + refetch | new event row visible after `fire test` succeeds |

## Network calls expected during normal use

| trigger    | method | path                         | what request body or query is expected  |
| ---------- | ------ | ---------------------------- | --------------------------------------- |
| Page mount | GET    | /api/events?name=…&limit=200 | hydrate event history for this name     |
| Page mount | GET    | /api/events/types?limit=500  | resolve `typeDef` (description, schema) |
| Page mount | GET    | /api/webhooks?limit=500      | filter subscribers for this event       |
| Fire test  | POST   | /api/events                  | `{ name, payload, … }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/event-detail.spec.ts`
