# Page observations: /c/:slug (CategoryDetail)

> Authenticated category detail page. Loads `/api/categories-by-slug/:slug`
> for header + `/api/categories/:slug/threads` for the thread list,
> rendered through ThreadRow. Sort buttons re-filter the list client-side.

## Page state assumed

- [x] Authenticated; tested with seeded `philosophy` category.

## Elements

| selector / accessible name                           | role    | expected behavior on interaction                                 | success signal                                       | failure signal                 |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| header heading                                       | heading | renders the category name from API                               | "Philosophy & Ethics" visible                        | shows fallback text or nothing |
| `getByRole('link', { name: /Categories/i }).first()` | link    | breadcrumb back to /c                                            | url `/c` after click                                 | navigation no-op               |
| `getByRole('link', { name: /Start a thread/i })`     | link    | header CTA → /compose?category=:slug                             | url contains `/compose?category=`                    | wrong href                     |
| `getByRole('button', { name: /Most recent/i })`      | button  | sort button highlights itself + lists threads in recent order    | `aria-pressed`-like visual change OR list re-renders | no visual change               |
| `getByRole('button', { name: /Top this week/i })`    | button  | sort by view_count desc                                          | order updates                                        | clicking does nothing          |
| `getByRole('button', { name: /Unanswered/i })`       | button  | filters to reply_count==0 only                                   | filtered list rendered                               | no filtering                   |
| created thread visible                               | n/a     | a freshly POSTed thread to this category appears in the list     | thread title visible after reload                    | newly created thread missing   |
| empty state                                          | n/a     | a category with zero threads renders the localized empty message | empty text visible                                   | renders ghost cards            |

## Network calls expected during normal use

| trigger    | method | path                            | what request body or query is expected |
| ---------- | ------ | ------------------------------- | -------------------------------------- |
| route load | GET    | `/api/categories-by-slug/:slug` | 200 with category row                  |
| route load | GET    | `/api/categories/:slug/threads` | 200 with `{ data: [...] }`             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/c__slug.spec.ts`
