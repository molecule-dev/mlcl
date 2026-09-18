---
name: star-ratings
intent: |
  - "Let people rate things"
  - "Star ratings"
  - "Reviews with 1-5 stars"
  - "Rate this product / service / post"
  - "Show average rating"
keywords: [rating, star, review, rate, score, feedback]
---

# Star ratings (1–5 + average display)

**When to copy this example:** the user wants any "rate this thing"
flow — product reviews, recipe ratings, service ratings.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-rating-display-react --workspace=app
```

## Files in this example

| Path                              | What it does                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/ratings.ts`         | `POST /ratings` — one rating per (user, subject); upserts. `GET /ratings/avg/:subject_id` returns `{ average, count }`. |
| `app/components/RatingWidget.tsx` | `<StarRating>` for read + write; collapses to read-only with avg + count for visitors.                                  |

## Anti-patterns

- Do not store a denormalised `average_rating` column without a way
  to recompute. Off-by-one drift is a classic bug. Recompute server-
  side or use a database trigger.
- Do not allow infinite ratings per user per subject — enforce a
  unique index on `(user_id, subject_id)` and use upsert.
- Do not invent `@molecule/app-reviews` or `@molecule/api-ratings`.
  For display-only or inline interactive star picking use
  `@molecule/app-rating-display-react` (`<RatingDisplay onChange={...}>`).
  For a full review form (stars + comment textarea + submit button) use
  `@molecule/app-rating-form-react` (`<RatingForm onSubmit={...}>`).
  The backend is normal handler code on top of the database.
- Do not display "0 stars (0 reviews)" — use empty state copy
  ("No ratings yet — be the first").

## Verify

Logged-in user clicks 4 stars on a product → `/ratings/avg` reflects
the new average within seconds. Same user changes to 5 stars →
single row updated, no duplicate. Logged-out user sees stars but
clicking does nothing.
