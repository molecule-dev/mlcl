#!/usr/bin/env node
/**
 * Parity coverage gate — the deterministic check that keeps mlcl and the IDE
 * in sync. Walks molecule-dev's router.ts (and server.ts WS routes), extracts
 * every route path, and fails when a route has no decision row in
 * docs/PARITY.md. The manifest is the source of truth for INTENT; this gate
 * is the enforcement that the intent covers reality.
 *
 * Route matching: PARITY.md rows list route fragments (e.g. `/deployments`,
 * `/cli/device-code`). A platform route is "covered" when any row's route
 * cell contains a fragment that matches one of its path segments. Param
 * segments (`:id`, `:projectId`) are wildcards.
 *
 * Usage: node scripts/check-parity-coverage.mjs [--report]
 * Exit 1 on uncovered routes.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MLCL = join(import.meta.dirname, '..')
const ROUTER = join(MLCL, '..', 'molecule-dev', 'api', 'src', 'App', 'router.ts')
const PARITY = join(MLCL, 'docs', 'PARITY.md')

// ── 1. Extract every route from the platform router ─────────────────────────
const routerSrc = readFileSync(ROUTER, 'utf8')
const routes = new Set()
for (const m of routerSrc.matchAll(/router\.(get|post|put|patch|delete|all)\(\s*[`'"]([^`'"]+)/g)) {
  routes.add(`${m[1].toUpperCase()} ${m[2]}`)
}
// server.ts WS routes
try {
  const serverSrc = readFileSync(
    join(MLCL, '..', 'molecule-dev', 'api', 'src', 'server.ts'),
    'utf8',
  )
  for (const m of serverSrc.matchAll(/["'`]\/ws\/[^"'`]+["'`]/g))
    routes.add(`WS ${m[0].slice(1, -1)}`)
} catch (_error) {
  // server.ts is optional in this checkout - WS coverage is best-effort.
}

// ── 2. Extract decided fragments from PARITY.md ─────────────────────────────
const paritySrc = readFileSync(PARITY, 'utf8')
const decisions = []
for (const line of paritySrc.split('\n')) {
  if (!line.startsWith('|')) continue
  const cells = line.split('|').map((c) => c.trim())
  if (cells.length < 4) continue
  const routeCell = cells[2] ?? ''
  const decision = cells[3] ?? ''
  if (!/parity|local-equivalent|ide-only|gap/.test(decision)) continue
  // fragments like `/deployments`, `/cli/device-code`, `/ws/projects/:id/terminal`
  for (const frag of routeCell.matchAll(/\/[a-z0-9:_-]+/gi)) {
    decisions.push({ fragment: frag[0], decision })
  }
}

// ── 3. Match: a route is covered when a decision fragment matches a segment ─
function routeCovered(route) {
  const path = route.replace(/^[A-Z]+\s+/, '')
  const segments = path.split('/').filter(Boolean)
  return decisions.some(({ fragment }) => {
    const fragSegs = fragment.split('/').filter(Boolean)
    if (fragSegs.length === 0) return false
    // slide the fragment over the route segments (params wildcard)
    for (let i = 0; i + fragSegs.length <= segments.length; i++) {
      let ok = true
      for (let j = 0; j < fragSegs.length; j++) {
        const f = fragSegs[j]
        const s = segments[i + j]
        if (f.startsWith(':')) continue
        if (f !== s) {
          ok = false
          break
        }
      }
      if (ok) return true
    }
    return false
  })
}

const uncovered = [...routes].filter((r) => !routeCovered(r)).sort()

// ── 4. Report ────────────────────────────────────────────────────────────────
const gaps = paritySrc.split('\n').filter((l) => l.includes('| gap |') || l.includes('⬜')).length

console.log(`platform routes: ${routes.size}`)
console.log(`decisions in PARITY.md: ${decisions.length} fragments`)
console.log(`covered: ${routes.size - uncovered.length}`)
console.log(`uncovered: ${uncovered.length}`)
console.log(`open gaps (⬜): ${gaps} — tracked, not a failure`)
if (uncovered.length > 0) {
  console.log('\nUNCOVERED (add a decision row to docs/PARITY.md):')
  for (const r of uncovered) console.log(`  ${r}`)
  console.log(
    '\nEvery platform route needs an explicit decision: parity | local-equivalent | ide-only | gap.',
  )
  process.exit(1)
}
console.log('\n✓ parity manifest covers every platform route')
