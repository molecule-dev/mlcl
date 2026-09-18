# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. Sign up via `signup(page)` then `browser_navigate` → `/settings`.
2. `browser_snapshot` to get the accessibility tree.
3. Walk every node — color profile cards, behaviour toggles, plan card buttons.
4. Reload after toggling — confirm UI state survives via localStorage.
5. Re-navigate and re-snapshot.
6. When complete, write `e2e/settings.spec.ts`.

## Page state assumed

- [x] Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                              | role             | expected behavior on interaction                                                                                                                             | success signal                                                                                                                  | failure signal                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `[data-mol-id="settings-profile-display-p3"]` (and other color profiles)                                                                                | button           | sets the active color profile and persists to `localStorage('lustra:colorProfile')`; survives a page reload                                                  | `data-active="true"` after click; same after `page.reload()`; localStorage value matches                                        | reverts after reload                    |
| `[data-mol-id="settings-toggle-autosave"]` and `[data-mol-id="settings-toggle-aiSuggest"]`                                                              | switch           | toggle a boolean preference, persisted in `localStorage('lustra:editorToggles')`; survive a page reload                                                      | `aria-checked` and `data-checked` flip and persist after reload                                                                 | reverts after reload                    |
| `[data-mol-id="settings-plan-card"]` (`data-plan-key`) + `[data-mol-id="settings-plan-name"]` + `[data-mol-id="settings-plan-upgrade-pro"]` (free user) | container/button | reflects current plan from `/api/billing/status`; for free users the Pro upgrade button must be wired and the tiers list must include `free` + `pro`         | `data-plan-key="free"`, plan-name contains `Free`, Pro upgrade button visible, GET `/api/billing/tiers` returns ≥ `[free, pro]` | wrong attribute / stuck "Loading plan…" |
| `[data-mol-id="settings-plan-upgrade-pro"]` (clicked)                                                                                                   | button           | POST `/api/billing/checkout` with the Pro monthly priceId; response `checkoutUrl` matches Stripe Checkout (`checkout.stripe.com` or `cs_test_*`/`cs_live_*`) | POST 200 + real Stripe URL in body                                                                                              | empty body / wrong URL                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | settings is fully visible at all times       |

## Network calls expected during normal use

| trigger                                     | method | path                    | what request body or query is expected                       |
| ------------------------------------------- | ------ | ----------------------- | ------------------------------------------------------------ |
| (page load)                                 | GET    | `/api/billing/status`   | `{ planKey, name, isFree }`                                  |
| (page load)                                 | GET    | `/api/billing/tiers`    | `{ data: [{ key, name, prices, limits }] }`                  |
| `[data-mol-id="settings-plan-upgrade-pro"]` | POST   | `/api/billing/checkout` | `{ priceId }` → `{ checkoutUrl }` (real Stripe checkout URL) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
