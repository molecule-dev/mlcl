# Page observations: /notifications (Notifications)

> Authed notifications shell.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name                         | role    | expected behavior on interaction | success signal | failure signal  |
| -------------------------------------------------- | ------- | -------------------------------- | -------------- | --------------- |
| `getByRole('heading', { name: /Notifications/i })` | heading | rendered as section heading      | visible        | missing on page |

## Hidden surfaces opened from this page

| trigger                         | what it opens            | elements inside                                  |
| ------------------------------- | ------------------------ | ------------------------------------------------ |
| top-nav `Bazaar` brand          | header brand link → home | logo, link href="/"                              |
| account menu / profile dropdown | account dropdown         | links to /settings, /orders, /wishlist, sign-out |

## Network calls expected during normal use

| trigger     | method | path        | expected body |
| ----------- | ------ | ----------- | ------------- |
| view orders | GET    | /api/orders | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
