# Page observations: /c (CategoriesList)

> Authenticated agora landing. Loads `/api/categories-rich` and
> renders a hero (with primary "Start a thread" CTA + secondary
> "Search the archive" CTA) plus the categories grid. Each card
> links to `/c/:slug`.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                   | role | expected behavior on interaction                 | success signal                  | failure signal             |
| ------------------------------------------------------------ | ---- | ------------------------------------------------ | ------------------------------- | -------------------------- |
| `getByRole('link', { name: /Start a thread/i }).first()`     | link | hero CTA → /compose                              | url `/compose`                  | navigation no-op           |
| `getByRole('link', { name: /Search the archive/i }).first()` | link | hero CTA → /search                               | url `/search`                   | navigation no-op           |
| `page.getByText(/Live rooms/i)`                              | text | hero stat "Live rooms" present with a number     | numeric value rendered          | shows raw key              |
| `page.getByText(/Threads/i).first()`                         | text | hero stat "Threads" present                      | text visible                    | missing                    |
| `page.getByText(/Posts/i).first()`                           | text | hero stat "Posts" present                        | text visible                    | missing                    |
| `getByRole('link').filter({ hasText: /philosophy/i })`       | link | seeded category card links to /c/philosophy      | url `/c/philosophy` after click | card missing or wrong href |
| `getByRole('link').filter({ hasText: /community/i })`        | link | seeded community-hall card links to /c/community | url `/c/community` after click  | card missing               |

## Network calls expected during normal use

| trigger        | method | path                   | what request body or query is expected                  |
| -------------- | ------ | ---------------------- | ------------------------------------------------------- |
| initial render | GET    | `/api/categories-rich` | 200 with [{slug, name, thread_count, post_count, …}, …] |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/c.spec.ts`
