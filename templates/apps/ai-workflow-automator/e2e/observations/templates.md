# Page observations: /templates

> Authenticated templates catalog. Lists workflow_templates and lets the
> user install one (which creates a new workflow row).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction | success signal | failure signal |
| ------------------------------------------- | ------- | -------------------------------- | -------------- | -------------- |
| `getByRole("heading", { level: 1 })`        | heading | page heading visible             | visible        | empty          |
| `getByRole("link", { name: /workflows/i })` | link    | back to /workflows               | URL changes    | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger       | method | path                       | expected body                      |
| ------------- | ------ | -------------------------- | ---------------------------------- |
| page load     | GET    | /api/templates             | [ { id, name, description, ... } ] |
| install click | POST   | /api/templates/:id/install | new workflow row 201               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-templates.spec.ts`
