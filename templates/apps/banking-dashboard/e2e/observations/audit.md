# Page observations: /audit (AuditLog)

Source: live walk via Playwright + e2e/audit.spec.ts.
The audit feed is server-derived: a synthetic "current sign-in" entry
is always present, plus rows for recent transfers + account-link
events.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction                                        | success signal                           | failure signal |
| ----------------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ---------------------------------------- | -------------- |
| `getByRole('heading', { name: /audit log/i, level: 1 })`    | heading | h1 renders                                                              | visible                                  | missing        |
| Eyebrow "Security & access"                                 | text    | uppercase eyebrow above h1                                              | visible                                  | missing        |
| Subheading mentioning "24 months"                           | text    | descriptive subline                                                     | visible                                  | missing        |
| Successful-count chip (`{{count}} successful`)              | text    | renders count of `status=success` events                                | matches API                              | wrong          |
| Failed-count chip (`{{count}} failed`)                      | text    | renders only when failed > 0                                            | matches API                              | wrong          |
| Total-count chip (`{{count}} total`)                        | text    | renders total event count                                               | matches API                              | wrong          |
| Audit row (`<li>`): icon + description + ip · ua · datetime | list    | one `<li>` per row from /api/audit_events                               | rows present including synthetic sign_in | empty list     |
| Sign-in synthetic row                                       | text    | description "Signed in to current session" appears for any authed visit | visible                                  | missing        |
| Failed-badge (when applicable)                              | text    | renders the `Failed` badge for status=failed rows                       | visible when failed events exist         | absent         |

## Hidden surfaces opened from this page

| trigger                       | what it opens | elements inside (selector / role / behavior) |
| ----------------------------- | ------------- | -------------------------------------------- |
| (none — pure feed; no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path              | what request body or query is expected                   |
| ------------ | ------ | ----------------- | -------------------------------------------------------- |
| initial load | GET    | /api/audit_events | 200 with `{ data:[…], total }` of synthesised audit rows |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/audit.spec.ts`
