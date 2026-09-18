# Page observations: /posts/:id/edit (PostEditor — edit)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/posts/<seeded-id>/edit. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role                          | expected behavior on interaction                         | success signal                        | failure signal |
| ------------------------------------------------ | ----------------------------- | -------------------------------------------------------- | ------------------------------------- | -------------- |
| `#input-post-title`                              | textbox                       | hydrates with existing post.title via GET /api/posts/:id | input value === seeded title          | empty input    |
| Excerpt input                                    | textbox                       | hydrates with existing excerpt                           | value populated                       | empty          |
| Body textarea                                    | textbox                       | hydrates with existing content                           | value populated                       | empty          |
| Tag chips (PostEditorTagsSection)                | listitems                     | hydrates with existing tags                              | seeded tags rendered as chips         | empty          |
| Cover image (PostEditorCoverImage)               | img/input                     | hydrates with existing cover_image_url                   | preview shows seeded url              | placeholder    |
| `getByRole('button', { name: /save\s*draft/i })` | button                        | PUT /api/posts/:id with status='draft'                   | server returns updated row            | error          |
| `getByRole('button', { name: /publish/i })`      | button                        | PUT /api/posts/:id status='published' → /posts           | navigates to /posts, status reflected | unchanged      |
| AI summarize button                              | button                        | POST /api/posts/:id/summarize                            | excerpt/content updated               | error          |
| Error toast                                      | alert                         | displays server errors with dismiss                      | visible on failure                    | absent         |
| Loading spinner during PUT                       | progressbar / button-disabled | publish/save buttons disable while in flight             | disabled then re-enabled              | not blocked    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                     | what request body or query is expected                         |
| ------------ | ------ | ------------------------ | -------------------------------------------------------------- |
| page load    | GET    | /api/posts/:id           | hydrate the editor state                                       |
| save draft   | PUT    | /api/posts/:id           | { title, excerpt, body, tags, status:'draft' }                 |
| publish      | PUT    | /api/posts/:id           | { title, excerpt, body, tags, coverImage, status:'published' } |
| ai summarize | POST   | /api/posts/:id/summarize | no body                                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/posts__id_edit.spec.ts`
