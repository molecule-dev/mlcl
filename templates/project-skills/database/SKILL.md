---
name: database
description: Database operations using the DataStore abstraction. CRUD methods, query filters, schema migrations, when raw SQL is acceptable.
---

# Database

All database operations use the abstract DataStore from `@molecule/api-database`. Never write raw SQL in handlers.

```typescript
import {
  findById,
  findOne,
  findMany,
  count,
  create,
  updateById,
  updateMany,
  deleteById,
  deleteMany,
} from '@molecule/api-database'
```

## DataStore Methods

| Method       | Signature                           | Purpose                              |
| ------------ | ----------------------------------- | ------------------------------------ |
| `findById`   | `findById<T>(table, id)`            | Get one record by primary key        |
| `findOne`    | `findOne<T>(table, where)`          | Get first matching record            |
| `findMany`   | `findMany<T>(table, options?)`      | Query with filters, sort, pagination |
| `count`      | `count(table, where?)`              | Count matching records               |
| `create`     | `create<T>(table, data)`            | Insert new record (returns created)  |
| `updateById` | `updateById<T>(table, id, data)`    | Update by primary key                |
| `updateMany` | `updateMany<T>(table, where, data)` | Update all matching records          |
| `deleteById` | `deleteById(table, id)`             | Delete by primary key                |
| `deleteMany` | `deleteMany(table, where)`          | Delete all matching records          |

## Query Filters (WhereCondition)

```typescript
const todos = await findMany<Todo>('todos', {
  where: [
    { field: 'userId', operator: '=', value: userId },
    { field: 'completed', operator: '=', value: false },
  ],
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 50,
  offset: 0,
})
```

### Available Operators

| Operator             | Description                                                                                                                  | Example                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `=`                  | Equals                                                                                                                       | `{ field: 'status', operator: '=', value: 'active' }`               |
| `!=`                 | Not equals                                                                                                                   | `{ field: 'status', operator: '!=', value: 'deleted' }`             |
| `>`, `<`, `>=`, `<=` | Comparison                                                                                                                   | `{ field: 'age', operator: '>=', value: 18 }`                       |
| `in`                 | In array                                                                                                                     | `{ field: 'status', operator: 'in', value: ['active', 'pending'] }` |
| `not_in`             | Not in array                                                                                                                 | `{ field: 'role', operator: 'not_in', value: ['admin'] }`           |
| `like`               | Raw pattern match (caller controls `%`/`_` wildcards)                                                                        | `{ field: 'slug', operator: 'like', value: 'admin_%' }`             |
| `ilike`              | Case-insensitive contains on a LITERAL substring (wildcards auto-escaped) — **prefer this for any human-typed search input** | `{ field: 'name', operator: 'ilike', value: searchInput }`          |
| `is_null`            | Is null                                                                                                                      | `{ field: 'deletedAt', operator: 'is_null', value: true }`          |
| `is_not_null`        | Not null                                                                                                                     | `{ field: 'email', operator: 'is_not_null', value: true }`          |

## CRUD Examples

```typescript
// Create — returns { data, affected }; read .data for the new row
const { data: created } = await create<Todo>('todos', {
  title: 'Buy milk',
  userId,
  completed: false,
  createdAt: new Date().toISOString(),
})

// Read by ID — returns the row or null
const todo = await findById<Todo>('todos', id)

// Read with filters
const myTodos = await findMany<Todo>('todos', {
  where: [{ field: 'userId', operator: '=', value: userId }],
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 20,
})

// Find one
const user = await findOne<User>('users', [{ field: 'email', operator: '=', value: email }])

// Count
const total = await count('todos', [{ field: 'userId', operator: '=', value: userId }])

// Update
await updateById('todos', id, { completed: true })

// Bulk update
await updateMany('todos', [{ field: 'userId', operator: '=', value: userId }], { completed: true })

// Delete
await deleteById('todos', id)

// Bulk delete
await deleteMany('todos', [{ field: 'completed', operator: '=', value: true }])
```

## Database dialect — match the DB this project actually uses

This project's database is whichever `@molecule/api-database-*` bond is wired in
`api/src/bonds/` (`database-sqlite.ts` → SQLite, `database-postgresql.ts` →
PostgreSQL). Write every migration in ITS SQL dialect. (Switching to another
database when the user asks is a migration job — the `bond-system` skill has the
steps.) The differences that bite:

| Need              | SQLite (default)                                                                                                                         | PostgreSQL                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| id column         | `"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))`                                                                             | `"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| timestamp default | `TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))` — or just `DEFAULT now()`, which the SQLite bond rewrites to exactly that | `TIMESTAMPTZ NOT NULL DEFAULT now()`              |
| boolean           | `INTEGER NOT NULL DEFAULT 0` (use 0/1)                                                                                                   | `BOOLEAN NOT NULL DEFAULT false`                  |
| make the DB       | not needed — the connection is ready                                                                                                     | provisioned for you; never `CREATE DATABASE`      |

`gen_random_uuid()`, `now()`, `CREATE DATABASE`, and `public.` schema prefixes are
PostgreSQL-only and WILL fail on SQLite — the #1 cause of a brand-new app crashing on
boot. For exact types + APIs, read the wired `@molecule/api-database-*` package's docs
(`read_molecule_doc`, or `npx mlcl docs <package>`). Match the dialect and the app comes up clean the first time.

**A timestamp column is the one place this bites silently.** SQLite's own
`datetime('now')` and `CURRENT_TIMESTAMP` store `2026-10-16 12:36:00` —
space-separated, no `Z`, whole seconds. `new Date(value)` parses that as LOCAL time
(so the value reads back hours off), it is not ISO-8601 so nothing that validates the
format accepts it, and two rows written in the same second are byte-identical strings,
so `ORDER BY "createdAt" DESC` is a tie and "newest first" comes back in any order. Use
the `strftime` form above, or a plain `DEFAULT now()` and let the bond rewrite it —
those yield `2026-10-16T12:36:00.123Z`, which round-trips through `new Date()` and
compares as a string in time order.

**The migrations already in `api/migrations/` are a different case — do not read them
as the dialect to copy.** Every `@molecule/api-resource-*` package publishes ONE setup
file per table, in POSTGRES dialect (`uuid`, `timestamptz`, `DEFAULT now()`,
`gen_random_uuid()`), and so do the scaffold's own starter migrations. The non-Postgres
bonds rewrite those constructs as each file is applied (`translateDdlToSqlite` /
`translateDdlToMysql`), which is what lets one published file serve every database — so
`uuid` in a file you did not write is not a bug and not a leftover to "fix". Write the
migrations YOU author in the dialect above; copy a package's file as it is (next
section).

## Schema & Migrations

Tables are defined as numbered `.sql` files in `api/migrations/`, NOT in code. The
migration runner (`api/src/scripts/migrate.ts`, which already exists and uses
`createMigrator`) applies every `*.sql` file in order. To add a table, create a new
file like `api/migrations/0010_create_todos.sql` — `migrate.ts` picks it up with no
change, and a table created with an ad-hoc `query()` never reaches another database.

```sql
-- api/migrations/0010_create_todos.sql  (PostgreSQL dialect; for SQLite see the table above)
CREATE TABLE IF NOT EXISTS "todos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_todos_user_id" ON "todos" ("user_id");
```

Write the SQL in YOUR project's dialect (for SQLite use the left-column forms above —
no `gen_random_uuid()`/`now()`/`public.`). The id column's DB default means `create()`
never needs an `id`. The runner picks up the new file automatically — you don't run it.

### Adding a @molecule package that ships its OWN tables

**A package that was in the scaffold's package list already has its tables.** Its
`__setup__/*.sql` is copied into the app at create time (`api/__setup__/`, replayed by the
migration runner on every boot) and the scaffold's own `api/migrations/*.sql` create the same
tables — `ls api/migrations` shows them. **Copy a `__setup__` file only for a package you add
AFTER the scaffold.** For a package you add later, its docs (`read_molecule_doc`, or `npx mlcl docs <package>`) show a "Tables:" note
pointing at a `__setup__/*.sql` file, and that DDL is applied automatically
ONLY for a table the project's own `api/migrations/*.sql` does not already create. Its table does
NOT exist yet — every call through it fails at runtime with "relation/table ... does not exist",
even though your code is correct. Do NOT assume the runtime creates it — nothing does.
Materialize it:
**copy the package's own `__setup__/*.sql` file (e.g.
`node_modules/@molecule/<pkg>/src/__setup__/*.sql`, or `<pkg>/setup/*.sql` in the older
layout) into a new numbered `api/migrations/NNNN_<name>.sql`, as it is** — the bond
rewrites the Postgres constructs in it as the migration is applied, so the file applies
on SQLite and MySQL unchanged. Never hand-transcribe a package's schema into your own
dialect: a typed-out copy drifts from the schema the package's own queries expect (miss
a column and every query naming it fails, on a table that otherwise looks right). Only on
D1 — which applies migrations out of band and translates nothing — write the file's
columns as SQLite DDL. Then the table is there and the integration works. This is the #1
reason a freshly-added resource "returns 500 on the first request".

That same rule runs the OTHER way, and it is silent. For a table the app's own
migrations already create (the auth `users` table, `projects`), the package's
`CREATE TABLE IF NOT EXISTS` is a no-op: its `__setup__/*.sql` lists columns the
project table MAY NOT HAVE. So a column you took from a package's schema — its Zod
schema or that file — is a schema the package EXPECTS, not the one you have. Before
selecting such a column, read the real table: the project's own
`api/migrations/*.sql`, or `psql "$DATABASE_URL" -c '\d users'`. If the column is
missing, add it with an idempotent `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS
"avatar" text;` in a NEW migration file — never by editing an applied
`CREATE TABLE`. Otherwise the query dies `42703 column ... does not exist` on a
table that predates the column, and copying the exact field list the package documents
cannot save it.

## When Raw SQL Is OK

1. **Migration scripts** — schema definitions are database-specific
2. **Complex queries** — JOINs, CTEs, aggregations, full-text search
3. **Performance-critical paths** — when the DataStore abstraction adds overhead

For complex queries, use the `query` function:

```typescript
import { query } from '@molecule/api-database'

const result = await query<{ id: string; count: number }>(
  `SELECT "userId" as id, COUNT(*) as count FROM "todos" GROUP BY "userId"`,
)
```

## Type Safety

Always pass a type parameter to DataStore methods:

```typescript
interface Todo {
  id: string
  userId: string
  title: string
  completed: boolean
  createdAt: string
}

const todo = await findById<Todo>('todos', id)
// todo is Todo | null
```
