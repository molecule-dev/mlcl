---
name: api-patterns
description: Backend architecture patterns. Creating resources, route registration, handlers, error handling, schema validation, environment variables.
---

# API Patterns

## Project Layout

```
api/src/
├── server.ts            # Entry point — starts Express (auto-generated, rarely touched)
├── bonds/               # Provider wiring (see bond-system skill)
│   └── index.ts         # Imports all bond setup functions
├── handlers/            # Domain API endpoints — ONE .ts per feature (THIS is where features go)
│   ├── index.ts         # Aggregates every handler: router.use('/habits', habits) — register new ones here
│   └── habits.ts        # An Express Router for /api/habits — open one to copy the exact pattern
└── App/
    ├── router.ts        # Mounts the handlers router + the framework's user/device routes (rarely touched)
    └── Resource/        # Framework built-in resources ONLY (User, Device) — never add app features here
```

## Creating a New Feature Endpoint

ALL domain/feature endpoints live in `api/src/handlers/<name>.ts` as an Express `Router`, registered in `api/src/handlers/index.ts`. (`api/src/App/Resource/` is ONLY the framework's built-in user/device resources — never add features there.)

**The most reliable way: open an existing file in `api/src/handlers/` and copy its exact shape** — same imports, same auth check, same DataStore calls. The existing handlers are the source of truth; mirror them. Use the template below only when there are no existing handlers to copy.

1. Create `api/src/handlers/<name>.ts` — an Express Router (see template).
2. Register it in `api/src/handlers/index.ts` (one import + one `router.use` line).

### Handler Template

```typescript
// api/src/handlers/widgets.ts
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'

import { create, deleteMany, findById, findMany } from '@molecule/api-database'
import { validateBody } from '@molecule/api-middleware-validation'
import { getParamId, getUserId } from '@molecule/api-resource'

const router = Router()

// GET /api/widgets — list the current user's widgets
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res) // NOTE: getUserId takes res, not req
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  const widgets = await findMany('widgets', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  res.json(widgets)
})

const createWidgetSchema = z.object({ name: z.string().min(1).max(255) })

// POST /api/widgets — create a widget owned by the current user
router.post(
  '/',
  validateBody(createWidgetSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }
    const result = await create('widgets', { ...req.body, user_id: userId })
    res.status(201).json(result.data) // create/updateById return { data, affected } — send .data
  },
)

// DELETE /api/widgets/:id — delete one the user owns
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('widgets', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: 'Widget not found.' })
    return
  }
  await deleteMany('widgets', [{ field: 'id', operator: '=', value: id }])
  res.status(204).end()
})

export default router
```

`getParamId(req, name)` defaults to the `id` parameter and takes the first value
if Express supplies an array. The `idParamSchema` export from
`@molecule/api-resource` validates a non-empty string `id`.

**A child router mounted at a dynamic path.** When a child router reads a parameter from its mount path (for example `/projects/:projectId/tasks`), construct it with `Router({ mergeParams: true })`; plain `Router()` leaves `req.params.projectId` undefined inside the child, so the route matches and its handler answers 404 about a missing record.

**DataStore calls** (`@molecule/api-database`) — mind the two call shapes:

- `findMany` takes an OPTIONS OBJECT: `findMany('widgets', { where: [{ field: 'user_id', operator: '=', value: userId }], orderBy: [{ field: 'created_at', direction: 'desc' }], limit, offset })`
- `count`, `findOne`, `updateMany`, `deleteMany` take a BARE conditions array: `deleteMany('widgets', [{ field: 'id', operator: '=', value: id }])`
- `findById('widgets', id)` returns the row or `null`.
- `create(...)` and `updateById(...)` return `{ data, affected }` — read `.data` for the row (e.g. `const { data } = await create('widgets', {...})`).

Every read/write MUST scope by the owner's `user_id` (ownership / no IDOR).

**Prefer molecule APIs over hand-rolled patterns:**

- IDs: give your id column a DB default (`gen_random_uuid()` on Postgres, or the SQLite equivalent) so `create('widgets', { ...fields })` doesn't need an `id` — the new row comes back on `.data`. No `uuid` package is needed: to generate an id in code, the built-in `crypto.randomUUID()` does it.
- Search: `@molecule/api-database` does export `query` for raw SQL, but for full-text search PREFER the bonded `@molecule/api-search-*` package (check the "installed packages" section for the exact one + its API) over hand-writing `to_tsvector`/`plainto_tsquery`.
- Don't install a package for something an already-installed `@molecule/*` package provides — check the installed-packages list first.

### Registering the Router

If `api/src/handlers/index.ts` already exists (most projects), just add ONE import + ONE `router.use` line — you don't touch `App/router.ts`, which already mounts the whole handlers router and applies auth:

```typescript
// api/src/handlers/index.ts
import { Router } from 'express'
import widgets from './widgets.js' // <- add this import (alongside the existing ones)

const router = Router()
router.use('/widgets', widgets) // <- add this line — routes are now under /api/widgets
// ...existing router.use() lines stay...

export default router
```

If there is NO `api/src/handlers/` yet (a from-scratch project), create `handlers/index.ts` exactly as above and mount it ONCE in `api/src/App/router.ts`:

```typescript
// api/src/App/router.ts
import handlers from '../handlers/index.js' // path is relative to App/
router.use(handlers)
```

Auth: when the project includes the default user resource, `getUserId(res)` is populated by the global `verifyMiddleware` — do NOT add per-route auth middleware. (A from-scratch project without it must add auth via the `bond-system` skill before `getUserId` works.)

## Error Handling

Each route callback is `(req: Request, res: Response)`. Check ownership/validity explicitly and return specific status codes; wrap risky work in try/catch:

```typescript
// inside api/src/handlers/<name>.ts
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // ... handler logic ...
    res.status(201).json(result)
  } catch (error) {
    console.error('POST /widgets failed:', error)
    // Specific message, never a generic "Internal server error"
    res.status(500).json({ error: 'Failed to create widget.' })
  }
})
```

**Rules:**

- Always return a specific error message: `'Failed to create widget.'`, not `'Internal server error'`
- **Log the error before every 500** (`console.error('POST /widgets failed:', error)`) — a swallowed error leaves nothing in `read_logs` to debug with
- Missing `getUserId(res)` → 401; record not found or not owned by the user → 404; bad input → 400
- For non-critical optional work (email, notifications), use nested try/catch so it can't break the main operation; truly fire-and-forget calls get `.catch(() => {})` so a rejection can't crash the process
- To make an error translatable client-side, return `{ error: t(key), errorKey: key }` — see the `i18n` skill

## Schema Validation with Zod

Prefer the `validateBody` / `validateParams` / `validateQuery` middleware from `@molecule/api-middleware-validation` — it parses and returns 400 automatically, keeping the route body clean:

```typescript
import { z } from 'zod'
import { validateBody } from '@molecule/api-middleware-validation'

const createWidgetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
})

router.post(
  '/',
  validateBody(createWidgetSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    const { data } = await create('widgets', { ...req.body, user_id: userId })
    res.status(201).json(data)
  },
)
```

## Environment Variables

Access with `process.env` and always provide defaults:

```typescript
const appName = process.env.APP_NAME || 'App'
const siteOrigin = process.env.SITE_ORIGIN || ''
const emailFrom = process.env.EMAIL_FROM || 'noreply@example.com'
```

| Variable           | Default                 | Purpose                            |
| ------------------ | ----------------------- | ---------------------------------- |
| `APP_NAME`         | `'App'`                 | Email subjects, branding           |
| `SITE_ORIGIN`      | `''`                    | Password reset links, email bodies |
| `EMAIL_FROM`       | `'noreply@example.com'` | Sender address                     |
| `JWT_REFRESH_TIME` | `1800000` (30 min)      | Token refresh threshold            |

## ESM Import Rule

Always use `.js` extensions in TypeScript imports:

```typescript
import { MyHandler } from './Resource/Todo/index.js' // ✓ correct
import { MyHandler } from './Resource/Todo/index' // ✗ wrong
```
