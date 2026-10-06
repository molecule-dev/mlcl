import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Schema-level pin for the honest-columns remediation: after the full
// migration sequence, `vault_recovery_keys` must carry the plain
// `recovery_kit` column (and no fake `public_key`), and `password_history`
// must carry `password_hash` + `password_preview` (and no `encrypted_password`).
// The assertions read the committed migration SQL in lexical order and replay
// every RENAME/ADD/DROP that touches the watched columns — the same order the
// Postgres migrator applies on a fresh install.

const MIGRATIONS_DIR = join(new URL('.', import.meta.url).pathname, '../../migrations')

type Op = { table: string; action: 'rename' | 'drop' | 'add'; from?: string; to?: string }

/** Minimal replay of the column-level ALTERs our migrations make. */
function finalColumns(): Record<string, Set<string>> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  const ops: Op[] = []
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    const rename =
      /ALTER TABLE\s+(?:public\.)?"?(\w+)"?\s+RENAME COLUMN\s+"?(\w+)"?\s+TO\s+"?(\w+)"?/gi
    for (const m of sql.matchAll(rename)) {
      ops.push({ table: m[1]!, action: 'rename', from: m[2]!, to: m[3]! })
    }
    const drop = /ALTER TABLE\s+(?:public\.)?"?(\w+)"?\s+DROP COLUMN\s+(?:IF EXISTS\s+)?"?(\w+)"?/gi
    for (const m of sql.matchAll(drop)) {
      ops.push({ table: m[1]!, action: 'drop', from: m[2]! })
    }
    const add =
      /ALTER TABLE\s+(?:public\.)?"?(\w+)"?\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/gi
    for (const m of sql.matchAll(add)) {
      ops.push({ table: m[1]!, action: 'add', to: m[2]! })
    }
  }

  const tables: Record<string, Set<string>> = {
    // Shapes as created by 0010_password_manager_tables.sql.
    vault_recovery_keys: new Set([
      'id',
      'user_id',
      'public_key',
      'encrypted_recovery_data',
      'created_at',
      'updatedAt',
    ]),
    password_history: new Set([
      'id',
      'item_id',
      'user_id',
      'encrypted_password',
      'created_at',
      'updatedAt',
    ]),
  }
  for (const op of ops) {
    const cols = tables[op.table]
    if (!cols) continue
    if (op.action === 'rename' && cols.has(op.from!)) {
      cols.delete(op.from!)
      cols.add(op.to!)
    } else if (op.action === 'drop') {
      cols.delete(op.from!)
    } else if (op.action === 'add') {
      cols.add(op.to!)
    }
  }
  return tables
}

describe('password-manager schema tells the truth about what it stores', () => {
  it('vault_recovery_keys holds recovery_kit; public_key + encrypted_* are gone', () => {
    const cols = finalColumns().vault_recovery_keys!
    expect(cols.has('recovery_kit')).toBe(true)
    expect(cols.has('public_key')).toBe(false)
    expect([...cols].some((c) => c.startsWith('encrypted_'))).toBe(false)
  })

  it('password_history holds password_hash + password_preview; encrypted_password is gone', () => {
    const cols = finalColumns().password_history!
    expect(cols.has('password_hash')).toBe(true)
    expect(cols.has('password_preview')).toBe(true)
    expect(cols.has('encrypted_password')).toBe(false)
  })

  it('no handler writes a fake encrypted_ or public_key column for these tables', async () => {
    const { join: pathJoin } = await import('node:path')
    const handlersDir = pathJoin(new URL('.', import.meta.url).pathname, '../handlers')
    const offenders: string[] = []
    for (const file of ['recovery-keys.ts', 'password-history.ts']) {
      const src = readFileSync(pathJoin(handlersDir, file), 'utf8')
      // Strip line comments — the docs EXPLAIN the old names; only real code
      // (column references) must not use them.
      const code = src
        .split('\n')
        .map((line) => line.replace(/^\s*\/\/.*$/, ''))
        .join('\n')
      if (/encrypted_recovery_data|public_key|encrypted_password/.test(code)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
