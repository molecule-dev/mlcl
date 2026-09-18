# Page observations: /my-coupons (MyCoupons)

> Captured authenticated. Tab strip lets the user filter by Active /
> Redeemed / Expired buckets — counts come from the /api/my_coupons feed.

## Page state assumed

- [x] Authenticated (sign up first)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                       | success signal                 | failure signal               |
| --------------------------------------------------------- | ------- | ------------------------------------------------------ | ------------------------------ | ---------------------------- |
| `getByRole('heading', { name: /my coupons/i, level: 1 })` | heading | renders the page title                                 | visible                        | missing                      |
| `getByRole('button', { name: /^active/i })`               | button  | shows the Active tab; counter reflects /api/my_coupons | tab activated, counter visible | no state change              |
| `getByRole('button', { name: /redeemed/i })`              | button  | shows the Redeemed tab                                 | tab activated                  | no state change              |
| `getByRole('button', { name: /expired/i })`               | button  | shows the Expired tab                                  | tab activated                  | no state change              |
| `page.getByText(/no coupons in this tab/i)`               | text    | renders empty-state when bucket is empty               | visible when bucket is empty   | hidden when bucket has items |
| `page.locator('article').first()`                         | article | when the user has saved coupons, renders one per row   | ≥1 article when populated      | empty after save             |

## Hidden surfaces opened from this page

| trigger                                        | what it opens | elements inside |
| ---------------------------------------------- | ------------- | --------------- |
| (none — tabs are siblings, no nested surfaces) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path            | expected body                       |
| --------- | ------ | --------------- | ----------------------------------- |
| Page load | GET    | /api/my_coupons | array of saved coupons for the user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/my-coupons.spec.ts`
