---
name: community-hub
intent: |
  - "Reddit clone"
  - "Hacker News clone"
  - "Product Hunt clone"
  - "Link aggregator"
  - "Community where people post and upvote"
  - "Discussion forum"
keywords: [reddit, hacker-news, forum, community, upvote, discussion, aggregator]
---

# Community hub (compound — multi-feature roadmap)

**This isn't a single example.** A community / forum / link aggregator
composes social-feed primitives + voting + threaded comments. Read
this README, then read each linked example.

## Build order

1. **`auth/oauth-google-login/`** OR **`auth/email-password-login/`**
   — community demands lightweight signup; OAuth wins.
2. **`content/markdown-blog/`** — adapt for user-submitted posts
   (rename `posts` table; add `author_id`, drop `draft` workflow).
3. **`messaging/in-app-chat/`** — adapt for threaded comments.
   Replace `channel_id` with `post_id`; add `parent_comment_id` for
   nesting.
4. **`ratings/star-ratings/`** — adapt for upvotes (1 stars only,
   binary toggle). Or write a dedicated `votes` table if you need
   ranking algorithms.
5. **`search/full-text-search/`** — search across posts.

## What you'll build on top

Custom code with no example coverage:

- **Ranking algorithm** — Hacker News uses
  `(votes - 1) / (age_hours + 2) ^ 1.8`. Reddit uses log-decayed
  scoring. Either way it's a SQL-or-job computed `hot_score` column.
- **Subreddits / channels** — if the community is non-flat,
  add a `community_id` column on posts + a community list page.
- **Moderation** — flag/report flow + mod actions (delete, lock,
  pin). Custom domain.
- **Karma / reputation** — use `@molecule/api-reputation` (per-user
  reputation/karma scoring + badge tracking: `recordEvent` on a vote,
  `getScore`, `computeLevel`, `awardBadge`) + `@molecule/app-reputation-badge-react`.
  Do NOT hand-roll denormalized counts on the user record.
- **Front page algorithm** — the actual ordering of the home feed.
  Cache aggressively; it's the most-hit query.

## Anti-patterns

- Do not invent `@molecule/app-reddit` or `@molecule/api-forum`.
  Communities are compositions.
- Do not let users vote on their own content. Server enforces
  this, not the UI.
- Do not skip rate-limiting. New accounts will spam if they can.
- Do not display a real-time live feed without throttling — a
  popular thread can cause re-render storms. Batch updates.

## Verify

Two users sign up → both submit a post → both upvote each other's
posts → home feed orders by hot score → comment thread on a post
shows nested replies → search finds posts by title.
