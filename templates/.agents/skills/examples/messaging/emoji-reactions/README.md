---
name: emoji-reactions
intent: |
  - "Emoji reactions"
  - "React to a post with emoji"
  - "Like / reaction bar"
  - "👍 ❤️ 😂 reactions"
  - "Reaction counts"
keywords:
  [emoji, reaction, reactions, react, like, likes, upvote, thumbs up, reaction bar, feedback]
---

# Emoji reactions (react to any resource)

**When to copy this example:** the user wants emoji reactions on something —
👍/❤️/😂 on a post, comment, message, etc., with per-emoji counts.

## What you'll install

```bash
cd /workspace
# The reaction chip bar…
npm install @molecule/app-emoji-reactions-react --workspace=app
# …and the backend reaction resource (add/remove/summary, session-scoped).
npm install @molecule/api-resource-reaction --workspace=api
```

## Files in this example

| Path                             | What it does                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/ReactionBar.tsx` | `<ReactionBar resourceType="post" resourceId={id} />` — fetches the reaction summary, maps it into the chip list, renders `<EmojiReactions>`, and toggles reactions (POST to add, DELETE to remove). |

The **backend is the ready-made `@molecule/api-resource-reaction`** — wire its
routes (`routes` + `requestHandlerMap`) behind your auth middleware. Endpoints:

```
POST   /api/:resourceType/:resourceId/reactions   # { type }  — add (idempotent)
DELETE /api/:resourceType/:resourceId/reactions?type=<emoji>   — remove that emoji
GET    /api/:resourceType/:resourceId/reactions   # summary: { total, counts, userReactions }
```

## Anti-patterns

- Do not rebuild a reaction bar or a reaction backend. Use `<EmojiReactions>`
  from `@molecule/app-emoji-reactions-react` and `@molecule/api-resource-reaction`.
- Do not pass the API summary straight to `<EmojiReactions>`. GET returns
  `{ counts, userReactions }` (per-emoji totals + the viewer's emoji), NOT a
  `reactions` chip array — map `counts` → `EmojiReaction[]` and set
  `reactedByMe` from `userReactions`, as `ReactionBar` does.
- Do not send a body with the DELETE. `http.delete(url, config?)` takes no
  data param — put the emoji in the query string (`?type=<emoji>`), which is
  where the resource's del handler reads it.
- Do not trust the client for who reacted. The server derives the reacting
  user from the SESSION (`res.locals.session.userId`) and fails closed with
  401 — never accept a user id from the request body.
- Do not skip the refetch after toggling (or replicate the server's idempotent
  add / typed remove in an optimistic update) — a stale count/`reactedByMe`
  desyncs the chips.
- Do not forget the migration. `@molecule/api-resource-reaction` ships
  `src/__setup__/reactions.sql` — run it (via your migration runner) or every
  add/remove/summary fails on a missing `reactions` table.

## Verify

A resource's reaction bar renders with the quick-pick emojis → clicking one
adds it with count 1 and highlights it (reactedByMe) → clicking it again
removes it → another user's reaction bumps the count.
