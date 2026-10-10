// @vitest-environment node
/**
 * `checkMigrationExists` decides whether a resource's table migration must be
 * planned or is already covered by a file in `migrations/`. A bare substring
 * match (`file.includes(tableName)`) answered "already covered" for files
 * belonging to a LONGER table name that merely contains this one —
 * `_create_post_comments_table.sql` for table `comments` — so injecting the
 * comments resource into a project that had migrated `post_comments` planned
 * NO migration for `comments`, and the table never existed at runtime
 * ("relation does not exist"). `--force` could not override it: migrations
 * bypass the file-op conflict machinery entirely (the skip happens at plan
 * time, the migration simply never enters `plan.migrations`).
 *
 * The match must be the canonical filename the planner itself writes —
 * `<timestamp>_create_<table>_table.sql`. A missed match is harmless by
 * contrast: resource SQL is `CREATE TABLE IF NOT EXISTS`, so a redundant
 * second migration is a no-op at apply time.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { checkMigrationExists } from '../injector.js'

let tempDir: string

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'mlcl-migration-exists-'))
})

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

/** A fresh migrations dir per test — one test's files must not answer another's. */
async function makeMigrationsDir(files: string[]): Promise<string> {
  const dir = join(tempDir, `migrations-${Math.random().toString(36).slice(2)}`)
  await mkdir(dir, { recursive: true })
  for (const name of files) {
    await writeFile(join(dir, name), `-- ${name}\nCREATE TABLE IF NOT EXISTS placeholder;\n`)
  }
  return dir
}

describe('checkMigrationExists — table-name boundaries', () => {
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    await mkdir(tempDir, { recursive: true })
  })

  it('finds the canonical migration for its own table', async () => {
    const dir = await makeMigrationsDir(['1748999999999_create_comments_table.sql'])
    const found = await checkMigrationExists(dir, 'comments')
    expect(found).not.toBeNull()
    expect(found).toContain('1748999999999_create_comments_table.sql')
  })

  it('does NOT mistake a longer table name containing this one for its migration', async () => {
    // post_comments contains "comments" as a substring — the old
    // `includes(tableName)` match returned this file, skipped the real
    // migration, and the comments table was silently never created.
    const dir = await makeMigrationsDir(['1748000000000_create_post_comments_table.sql'])
    expect(await checkMigrationExists(dir, 'comments')).toBeNull()
  })

  it('does NOT mistake a table name this one contains for its migration', async () => {
    const dir = await makeMigrationsDir(['1748000000000_create_users_table.sql'])
    expect(await checkMigrationExists(dir, 'users_roles')).toBeNull()
  })

  it('returns null when the migrations directory does not exist yet', async () => {
    expect(await checkMigrationExists(join(tempDir, 'no-such-dir'), 'comments')).toBeNull()
  })
})
