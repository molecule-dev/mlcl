# Page observations: /settings (Workspace settings)

> Filled from a live walk via Playwright MCP at /settings. Re-walk if
> any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction                          | success signal                   | failure signal                |
| -------------------------- | -------- | --------------------------------------------------------- | -------------------------------- | ----------------------------- |
| Sidebar nav: Branding      | button   | activate Branding section                                 | active state highlights          | no change                     |
| Sidebar nav: Integrations  | button   | activate Integrations section                             | seeded integration list rendered | no change                     |
| Section content panel      | region   | shows section-specific copy                               | content updates per section      | content stale                 |
| Authed-only access         | redirect | unauthed visit redirects to /login                        | URL becomes /login               | unauthenticated content shown |
| Network: bootstrap         | network  | loading the page issues at least one auth/context request | reqs.length > 0                  | no requests                   |

## Hidden surfaces opened from this page

| trigger       | what it opens | elements inside (selector / role / behavior) |
| ------------- | ------------- | -------------------------------------------- |
| (per section) | section panel | section-specific copy + integration list     |

## Network calls expected during normal use

| trigger                  | method | path | what request body or query is expected             |
| ------------------------ | ------ | ---- | -------------------------------------------------- |
| (no remote settings yet) | —      | —    | settings persist in localStorage via SettingsPanel |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/18-settings.spec.ts`
