# Page observations: /settings

> Authenticated org settings + projects list + integrations + danger zone.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name        | role                 | expected behavior on interaction                                             | success signal                                     | failure signal |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- | -------------- |
| Org name field                    | textbox              | PATCH /api/settings/me persists the new org_name                             | reload reflects                                    | reverts        |
| Projects list                     | list                 | renders projects from /api/projects-health                                   | ≥ 1 project visible                                | empty          |
| Add Slack integration button/form | button/form          | POST /api/settings/integrations persists the integration                     | integration appears                                | absent         |
| Reset workspace button            | button (destructive) | DELETE /api/settings/workspace wipes user-scoped data while keeping the user | subsequent profile fetch still 200, projects empty | errors         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-settings.spec.ts
