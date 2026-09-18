# Page observations: /privacy (Privacy)

> Filled from a live walk via Playwright MCP at /privacy.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role      | expected behavior on interaction          | success signal                                                      | failure signal            |
| -------------------------------------------- | --------- | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| `getByRole('heading', { name: 'Privacy' })`  | heading   | static heading                            | rendered                                                            | missing                   |
| `page paragraph` containing the policy intro | paragraph | static paragraph; references the app name | text contains the app name (e.g. "Pulse"), no `{{app}}` placeholder | placeholder still visible |
| `[data-mol-id=page-privacy]` (root)          | container | container present in DOM                  | element exists                                                      | missing                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

(none — static page)

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
