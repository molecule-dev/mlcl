/**
 * A resource package's migrations are planned in foreign-key order: `comment_numbers`
 * references `comments`, and planned first it failed on a fresh Postgres database, so the
 * API never booted (X1 flash-m38, 2026-10-16).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { tablesInDependencyOrder } from '../injector.js'

let dir: string | null = null
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = null
})

describe('tablesInDependencyOrder', () => {
  it('puts a referenced table before the table that references it', async () => {
    dir = mkdtempSync(join(tmpdir(), 'mol-order-'))
    const comments = join(dir, 'comments.sql')
    const numbers = join(dir, 'comment_numbers.sql')
    writeFileSync(comments, 'CREATE TABLE IF NOT EXISTS "comments" ("id" UUID PRIMARY KEY);')
    writeFileSync(
      numbers,
      'CREATE TABLE IF NOT EXISTS "comment_numbers" ("commentId" UUID REFERENCES "comments"("id"));',
    )
    const ordered = await tablesInDependencyOrder([
      { name: 'comment_numbers', sqlFile: numbers },
      { name: 'comments', sqlFile: comments },
    ])
    expect(ordered.map((t) => t.name)).toEqual(['comments', 'comment_numbers'])
  })

  it('keeps the listed order when nothing references anything, and survives a cycle', async () => {
    expect(
      (await tablesInDependencyOrder([{ name: 'b' }, { name: 'a' }])).map((t) => t.name),
    ).toEqual(['b', 'a'])
    dir = mkdtempSync(join(tmpdir(), 'mol-order-'))
    const a = join(dir, 'a.sql')
    const b = join(dir, 'b.sql')
    writeFileSync(a, 'CREATE TABLE "a" (x INT REFERENCES "b"(id));')
    writeFileSync(b, 'CREATE TABLE "b" (x INT REFERENCES "a"(id));')
    expect(
      (
        await tablesInDependencyOrder([
          { name: 'a', sqlFile: a },
          { name: 'b', sqlFile: b },
        ])
      ).length,
    ).toBe(2)
  })
})
