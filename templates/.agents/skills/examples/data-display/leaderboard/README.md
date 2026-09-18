---
name: leaderboard
intent: |
  - "Leaderboard"
  - "Ranked scores / top users"
  - "Gamification points ranking"
  - "Weekly / all-time rankings"
  - "Competition standings"
keywords:
  [
    leaderboard,
    ranking,
    rankings,
    ranked,
    scores,
    top users,
    points,
    xp,
    gamification,
    standings,
    competition,
  ]
---

# Leaderboard (ranked scores)

**When to copy this example:** the user wants a ranked list — top players/
users by points/XP, weekly or all-time standings, a competition board.

## What you'll install

```bash
cd /workspace
# The ranked-list UI (list container + row)…
npm install @molecule/app-leaderboard-list-react @molecule/app-leaderboard-row-react --workspace=app
# …and the leaderboard engine (record metrics, compute rankings).
npm install @molecule/api-leaderboard --workspace=api
```

## Files in this example

| Path                             | What it does                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/handlers/leaderboard.ts`    | `GET /leaderboard` → `getLeaderboard()` (ranked `{ user_id, rank, score }`) + a single `in`-query name join → `[{ rank, name, score, userId }]`. `POST /leaderboard/record` awards points via `recordMetric()` for the AUTHENTICATED user. |
| `app/components/Leaderboard.tsx` | `<Leaderboard currentUserId={id} />` — fetches the ranked rows and composes `<LeaderboardList>` + `<LeaderboardRow>`; highlights the viewer's own row via `isMe`.                                                                          |

For fresh windows, run `rollupLeaderboard({ metric, window })` on a cron (see
`@molecule/api-leaderboard`'s docs + the `jobs/scheduled-tasks` example).

## Anti-patterns

- Do not rebuild a ranking list or a scoring backend. Use
  `<LeaderboardList>` / `<LeaderboardRow>` and `@molecule/api-leaderboard`
  (`recordMetric` + `getLeaderboard`) — they exist.
- Do not award points from the client. `POST /leaderboard/record` uses the
  AUTHENTICATED user (`res.locals.session.userId`), never an id from the request
  body, and belongs behind the real earning action — an open record endpoint
  lets anyone inflate their rank.
- Do not resolve names with a per-row query. `getLeaderboard` returns
  `user_id`; join the users table in ONE query (`operator: 'in'`), as the
  handler does — a lookup per entry is an N+1.
- Do not compute rankings by hand in a handler (sort + slice over all rows).
  `getLeaderboard({ metric, window, limit })` does windowed aggregation +
  competition ranking (ties share a rank); reimplementing it drifts.
- Do not treat `rank` as a row index. It's 1-based competition rank — tied
  scores share a rank and the next distinct score skips ahead.
- Do not forget the migration. `@molecule/api-leaderboard` ships
  `src/__setup__/leaderboard_events.sql` — run it (via your migration runner)
  or `recordMetric` / `getLeaderboard` fail on a missing events table.

## Verify

`recordMetric` some users' points → `GET /leaderboard` returns them ranked
high-to-low with names → the list renders ranked rows → the current user's
row is highlighted (`isMe`).
