/**
 * [M1-1 / L1-1] Regression gate: no scaffolded app may set the auth token storage to
 * localStorage. The server issues the session JWT as an httpOnly+Secure+SameSite cookie
 * precisely so script can't read it; persisting a script-readable bearer copy in
 * localStorage defeats that and makes any XSS a 7-day account takeover. The framework's
 * secure default is in-memory ('memory'), so the templates must OMIT `storage`.
 *
 * This guards BOTH the base custom-scaffold template (shared/config.ts.tpl) and every
 * flagship app config — the pass-36 M1-1 sweep fixed the 133 flagships but missed the base
 * template (found as L1-1), so this test pins the whole class against drift.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'templates')

/** Every scaffolded app-config file: the base template + each flagship's config.ts. */
function authConfigFiles(): string[] {
  const files: string[] = []
  const base = join(TEMPLATES, 'app', 'shared', 'config.ts.tpl')
  if (existsSync(base)) files.push(base)
  const appsDir = join(TEMPLATES, 'apps')
  if (existsSync(appsDir)) {
    for (const app of readdirSync(appsDir)) {
      const cfg = join(appsDir, app, 'app', 'src', 'config.ts')
      if (existsSync(cfg)) files.push(cfg)
    }
  }
  return files
}

describe('scaffolded auth token storage default (M1-1 / L1-1)', () => {
  it('no scaffolded authConfig sets storage to localStorage (XSS-exfiltratable bearer copy)', () => {
    const offenders = authConfigFiles().filter((f) =>
      /storage\s*:\s*(globalThis\.|window\.)?localStorage/.test(readFileSync(f, 'utf8')),
    )
    expect(
      offenders,
      `these scaffold configs persist the auth token to localStorage:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('actually checks a meaningful number of config files (guard against a broken glob)', () => {
    // If this drops to ~0 the test above is vacuously passing — fail loudly instead.
    expect(authConfigFiles().length).toBeGreaterThan(50)
  })
})
