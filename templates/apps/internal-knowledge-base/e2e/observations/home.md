# Page observations: /home (Home)

Observed via Playwright MCP at `/home` while signed-out (redirects) and
authenticated (greeting + activity).

## Page state assumed

- [x] Authenticated (Home redirects unauthenticated visitors to /login)

## Elements

| selector / accessible name                            | role | expected behavior on interaction                                                                                           | success signal                                        | failure signal     |
| ----------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------ |
| guard (no element — /home navigation when signed-out) | n/a  | unauthenticated visitor is redirected to /login                                                                            | URL becomes /login                                    | stays on /home     |
| `getByText(/<firstName>/)`                            | text | personalized greeting using profile firstName                                                                              | name visible                                          | generic page       |
| `getByRole('link')` (recent-activity items)           | link | clicking an article link routes to /article/:id; spec uses `captureNetwork` to confirm activity feed makes backend fetches | URL match `/article/:id`; ≥1 backend request observed | no backend traffic |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger          | method | path          | what request body or query is expected |
| ---------------- | ------ | ------------- | -------------------------------------- |
| Page load (auth) | GET    | /api/articles | recent activity feed, 200              |
| Page load (auth) | GET    | /api/spaces   | sidebar / quick-link list, 200         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/home.spec.ts`
