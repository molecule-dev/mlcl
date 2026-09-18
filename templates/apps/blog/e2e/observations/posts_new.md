# Page observations: /posts/new (PostEditor — create)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/posts/new. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role       | expected behavior on interaction                       | success signal                       | failure signal                   |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------ | ------------------------------------ | -------------------------------- |
| `#input-post-title` (PostEditorHeader title input)         | textbox    | accepts the post title                                 | text accepted                        | not editable                     |
| Excerpt input (PostEditorHeader)                           | textbox    | accepts the post excerpt                               | text accepted                        | not editable                     |
| Body textarea (PostEditorBody)                             | textbox    | accepts the post body / markdown                       | text accepted                        | not editable                     |
| Cover-image dropzone (PostEditorCoverImage)                | input file | accepts a cover image                                  | image rendered, coverImage state set | upload rejected                  |
| Tag input + chips (PostEditorTagsSection)                  | combobox   | adds/removes tags (chips)                              | chip rendered for typed tag          | tag dropped                      |
| `getByRole('button', { name: /save\s*draft/i })` (top-bar) | button     | POST /api/posts with status=draft                      | persists draft, postId set           | toast error                      |
| `getByRole('button', { name: /publish/i })` (top-bar)      | button     | POST /api/posts with status=published, navigate /posts | navigates to /posts, row visible     | error toast                      |
| AI summarize floating button (PostEditorAIButton)          | button     | POST /api/posts/:id/summarize                          | excerpt and body update              | error toast / "save draft first" |
| Word/character footer counter (PostEditorFooter)           | status     | reflects body length live                              | counter updates as you type          | static                           |
| Error toast (bottom of page)                               | alert      | shows server errors with dismiss button                | visible on failure, dismissable      | absent                           |

## Hidden surfaces opened from this page

| trigger                     | what it opens | elements inside |
| --------------------------- | ------------- | --------------- |
| (none — single-pane editor) | —             | —               |

## Network calls expected during normal use

| trigger               | method | path                     | what request body or query is expected                         |
| --------------------- | ------ | ------------------------ | -------------------------------------------------------------- |
| save draft            | POST   | /api/posts               | { title, excerpt, body, tags, coverImage, status:'draft' }     |
| publish               | POST   | /api/posts               | { title, excerpt, body, tags, coverImage, status:'published' } |
| update existing draft | PUT    | /api/posts/:id           | same fields, status switches                                   |
| ai summarize          | POST   | /api/posts/:id/summarize | no body, response contains { excerpt, content }                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/posts_new.spec.ts`
