# Page observations: /wishlist (Wishlist)

> Authed wishlist — GET /api/wishlist, POST/DELETE for items.

## Page state assumed

- [x] Authenticated user

## Elements

| selector / accessible name                         | role    | expected behavior on interaction   | success signal            | failure signal                |
| -------------------------------------------------- | ------- | ---------------------------------- | ------------------------- | ----------------------------- |
| `page.locator('[name="Search curated goods..."]')` | textbox | accepts text input                 | value reflects typed text | value not retained            |
| `page.locator('[aria-label="Account menu"]')`      | button  | click triggers the action labelled | state changes accordingly | no state change / error toast |

## Hidden surfaces opened from this page

| trigger                | what it opens            | elements inside     |
| ---------------------- | ------------------------ | ------------------- |
| top-nav `Bazaar` brand | header brand link → home | logo, link href="/" |

## Network calls expected during normal use

| trigger            | method | path          | expected body |
| ------------------ | ------ | ------------- | ------------- |
| view/edit wishlist | GET    | /api/wishlist | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/wishlist.spec.ts`
