# Page observations: /plan-updated (PlanUpdated)

Observed via Playwright MCP at `/plan-updated` (post-checkout
confirmation page). Page renders a static confirmation message + a
"Return home" Button wrapped in a Link. Auth state is hydrated via the
@molecule/app-react useAuth hook before the buttons render — a Spinner
is shown until initialized.

## Page state assumed

- [x] Reachable post-checkout (Stripe redirects back here on success)

## Elements

| selector / accessible name                     | role                         | expected behavior on interaction                   | success signal                                | failure signal                                                                            |
| ---------------------------------------------- | ---------------------------- | -------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `getByRole('heading', { name: /thank           | message                      | plan/i })`                                         | heading                                       | Renders confirmation copy from `t('planUpdated.message')` and `t('planUpdated.thankYou')` | both heading lines visible within 10s                             | spinner stuck / blank |
| `getByRole('link')` (wraps Return home button) | link                         | href="/" — clicking routes the user back to /      | URL changes to `/`                            | stays on /plan-updated                                                                    |
| `getByRole('button', { name: /return home      | continue                     | home/i })`                                         | button                                        | The visible primary CTA inside the link                                                   | clicking the button (delegated to its parent link) navigates away | dead button           |
| `Spinner` while auth state initializes         | progressbar / busy indicator | Shown briefly until `state.initialized` flips true | spinner appears → disappears once initialized | spinner forever                                                                           |

## Hidden surfaces opened from this page

(none — page is a static confirmation; no menus / modals / tabs)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(none — page is a static confirmation; billing state is reconciled
elsewhere via `/api/billing/status` polling.)

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
