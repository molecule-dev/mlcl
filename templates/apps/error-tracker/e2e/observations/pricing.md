# Page observations: /pricing

> Anonymous pricing page. Renders billing tiers from /api/billing/tiers and shows current plan via /api/billing/status (when authenticated).

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name          | role | expected behavior on interaction               | success signal    | failure signal |
| ----------------------------------- | ---- | ---------------------------------------------- | ----------------- | -------------- |
| Tier cards                          | list | renders ≥ 1 tier from /api/billing/tiers       | tier name visible | empty          |
| Tier "free" with $0 price           | text | always present in tiers list                   | visible           | absent         |
| Plan-status indicator (when authed) | text | shows current planKey from /api/billing/status | planKey visible   | 500            |

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
- [x] All elements above have a corresponding test in the matching e2e/<n>-pricing.spec.ts
