---
name: comment-threads
intent: |
  - "Comment threads"
  - "Nested / threaded comments"
  - "Discussion under a post"
  - "Replies to comments"
  - "Comment section"
keywords:
  [
    comment,
    comments,
    thread,
    threads,
    threaded,
    discussion,
    reply,
    replies,
    nested,
    forum,
    comment section,
  ]
---

# Comment threads (nested comments on any resource)

**When to copy this example:** the user wants a comment section with
replies — threaded discussion under a post, project, page, etc.

## What you'll install

```bash
cd /workspace
# The threaded comment UI component…
npm install @molecule/app-feature-thread-tree-react --workspace=app
# …and the backend comment resource (create/list/reply/count endpoints).
npm install @molecule/api-resource-comment --workspace=api
```

## Files in this example

| Path                               | What it does                                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/CommentThread.tsx` | `<CommentThread resourceType="post" resourceId={id} />` — fetches the flat comment list, nests it into a tree (`buildTree`), renders the shared `<ThreadTree>`, and posts new comments/replies. |

The **backend is the ready-made `@molecule/api-resource-comment`** — wire its
routes (it ships `routes` + `requestHandlerMap`) via `mlcl inject` / your bond
setup. Endpoints:

```
POST   /api/:resourceType/:resourceId/comments      # { body, parentId }  (parentId=null → top-level)
GET    /api/:resourceType/:resourceId/comments      # PAGINATED: { data: Comment[], total, limit, offset }
GET    /api/:resourceType/:resourceId/comments/count # cheap badge count
PUT    /api/comments/:commentId                      # edit
DELETE /api/comments/:commentId                      # delete
```

The list GET returns a **paginated envelope** (`{ data, total, limit, offset }`), NOT a bare
array. Pass the whole HttpResponse to `unwrapList` from `@molecule/app-http` — it normalizes a
bare array, a `{ data }` envelope, AND this pagination shape → the flat rows. (The example does
exactly this; `res.data` alone is the envelope, so an `Array.isArray(res.data)` guard would yield
an empty thread.)

## Anti-patterns

- Do not rebuild a comment tree component or a comment backend. Use
  `<ThreadTree>` from `@molecule/app-feature-thread-tree-react` and
  `@molecule/api-resource-comment` — they exist.
- Do not assume the list GET returns a bare array. It's a PAGINATED envelope
  (`{ data, total, limit, offset }`). Normalize it with `unwrapList(res)` from
  `@molecule/app-http` (pass the whole HttpResponse) — do NOT hand-roll an
  `Array.isArray(res.data)` guard against the envelope; that silently yields an
  empty thread.
- Do not pass the API's FLAT rows straight to `<ThreadTree>`. They're a flat
  array linked by `parentId`; `<ThreadTree>` wants a tree of `children`. Nest
  it first (`buildTree` does this in two passes).
- Do not forget the migration. `@molecule/api-resource-comment` ships
  `src/__setup__/comments.sql` — run it (via your migration runner) or every
  query fails on a missing `comments` table.
- Do not show the raw `userId` as the author in production. The row carries
  `userId`; resolve it to a display name/avatar (join server-side, or map it
  client-side) — the example passes `userId` through as a placeholder.
- Do not trust the client for authorship or ownership. The server sets the
  comment's `userId` from the authenticated session and checks ownership on
  edit/delete — never accept an author id from the request body.
- Do not skip the refetch after posting. Re-load so a new reply lands in the
  right place in the tree (and counts update); optimistic insertion must
  replicate the same `parentId` nesting.

## Verify

A resource's comments render as a nested thread → posting adds a top-level
comment → clicking reply on a comment and posting nests it under that comment
after the refetch.
