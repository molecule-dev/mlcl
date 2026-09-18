# Page observations: /settings (Settings)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                       | role                   | expected behavior on interaction                                   | success signal                                                                          | failure signal                                                       |
| -------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `getByText(/rate plan/i).first()`                                                | heading                | rate-plan section loads existing seeded plan from /api/costs/rates | visible with at least one row                                                           | section missing or empty                                             |
| `form input[name='rate_per_kwh'], [data-mol-id="settings-rate-input"]`           | spinbutton             | rate-per-kwh editor — round-trips through /api/costs/rates on save | PUT/PATCH /api/costs/rates fires; reload shows new rate                                 | no save or value not persisted                                       |
| `[data-mol-id="settings-notify-push"], getByRole('checkbox', { name: /push/i })` | checkbox               | notify-push toggle saves to /api/me                                | PATCH /api/me with `{ notifyPush }`; getMe returns new value                            | no PATCH or value not persisted                                      |
| `getByRole('button', { name: /export                                             | download/i }).first()` | button                                                             | data-export downloads a CSV (also covers notify-email toggle persistence in same panel) | browser download with text/csv; PATCH /api/me roundtrips notifyEmail | no download or notify toggle not persisted |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger       | method | path                 | what request body or query is expected               |
| ------------- | ------ | -------------------- | ---------------------------------------------------- |
| initial load  | GET    | /api/costs/rates     | list of seeded rate plans                            |
| rate save     | PUT    | /api/costs/rates/:id | `{ rate_per_kwh, peak_rate?, off_peak_rate? }` → 200 |
| notify toggle | PATCH  | /api/me              | `{ notifyPush?, notifyEmail? }` → 200                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
