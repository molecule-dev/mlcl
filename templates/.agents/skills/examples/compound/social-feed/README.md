---
name: social-feed
intent: |
  - "Build me a social app"
  - "Instagram / Twitter / TikTok clone"
  - "Social network where people post things"
  - "A feed of posts from people I follow"
  - "Photo sharing app"
keywords: [social, feed, posts, follow, like, instagram, twitter, share]
---

# Social feed (compound — multi-feature roadmap)

**This isn't a single example.** A social-feed app composes several
primitives. Read this README as a build order, then read each linked
example for the actual code.

## Build order

1. **`auth/oauth-google-login/`** — friction-free signup is critical
   for social. Add OAuth + email-password later if needed.
2. **`uploads/profile-photo-upload/`** — every user has an avatar
   AND posts contain media. Same upload pattern, two call sites.
3. **`content/markdown-blog/`** — adapt for short-form posts.
   Rename `posts` table; drop the `slug` field; add an `author_id`
   foreign key and a `media_url` column for attached photos/video.
4. **`data-display/paginated-user-list/`** — repurpose for the feed.
   Rename `users` → `posts`; sort by `created_at desc`; filter to
   `author_id IN (people_i_follow)`.
5. **`messaging/in-app-chat/`** — DMs between users (optional but
   table-stakes for "social"). Channel = `dm:<userA>:<userB>`.

## What you'll build on top

Custom code with no example coverage:

- **Follows table** — `(follower_id, followee_id)`. One handler each
  for follow/unfollow.
- **Likes / reactions** — use `@molecule/api-resource-reaction` (polymorphic
  like/emoji reactions on ANY resource: `addReaction` / `removeReaction` /
  `getReactionSummary`) + the `@molecule/app-emoji-reactions-react` UI. Do NOT
  hand-roll a `(user_id, post_id)` table — and `@molecule/app-like-button-react`
  is not a real package; don't guess names.
- **Comments thread** — same shape as in-app-chat messages but scoped
  to a `post_id` instead of a `channel_id`.
- **Notifications** — when someone likes/comments/follows you. Wire
  the realtime bond from in-app-chat for live notifications,
  plus push via `@molecule/app-push` for offline.

## Anti-patterns

- Do not invent `@molecule/api-social` or `@molecule/app-feed`.
  No such package — composition.
- Do not load every post into the feed. Paginate with cursor-based
  pagination (last seen post id), NOT offset — the feed grows.
- Do not store a denormalised "likes count" column without a way to
  recompute. Off-by-one drift is a classic bug; use a trigger or
  rebuild nightly.
- Do not build comments before posts. Match the build order above.

## Verify

End-to-end: user A signs up → uploads avatar → creates a post → user B
(other browser) signs up → follows A → sees A's post in their feed →
likes it → comments → user A sees the notification in real time.
