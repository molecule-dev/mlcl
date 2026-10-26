#!/usr/bin/env node
/**
 * Plan a registry's setup-SQL metadata against COMMITTED package bytes.
 *
 * `sync-registry --scan-tables` applies `planSetupSqlEntrySync` to the WORKING
 * TREE. That is right for a deliberate re-scan, and wrong for a pin sweep: a pin
 * sweep must move the bundle of the version it is pinning, and the worktree may
 * (a) be ahead of that version (held / not yet published), or (b) carry another
 * session's uncommitted SQL edit. Either way the worktree is not the accepted
 * release's bytes.
 *
 * This helper is the same rule over a COMMITTED input: the caller materializes
 * the package directories from the git commit it accepts (see
 * `scripts/lib/pin-setup-sql.mjs` in the workspace root) and selects the registry
 * entries and pins with `MLCL_REGISTRY_PATH`. Every decision here is
 * `planSetupSqlEntrySync`'s — this script only feeds it committed bytes.
 *
 * A package whose committed `package.json` declares no exact version cannot tag
 * a bundle. When there is setup state to judge that is an ERROR (the caller
 * refuses before it writes anything); when the entry and the checkout both carry
 * no setup SQL it is irrelevant and answers `in-sync`, exactly as the planner
 * would.
 *
 * Usage (runs via tsx against mlcl SOURCE — no build needed):
 *   MLCL_REGISTRY_PATH=<scoped registry.json> \
 *     tsx scripts/plan-setup-sql-sync.mjs < jobs.json
 *
 * stdin:  { "jobs": [{ "name": "@molecule/x", "dir": "<absolute package dir>" }] }
 * stdout: { "plans": [{ "name": ..., "plan": SetupSqlSyncPlan }
 *                     | { "name": ..., "error": "<sentence>" }] }
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { relative } from 'node:path'

import { getMoleculeVersion, getRawRegistry } from '../src/lib/registry.js'
import { scanForTables, scanSetupSqlBundle } from '../src/lib/scanner.js'
import { readPackageVersion } from '../src/lib/setup-sql.js'
import { planSetupSqlEntrySync } from '../src/lib/setup-sql-version.js'

/** Read the job list from stdin. */
function readJobs() {
  const text = readFileSync(0, 'utf-8')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(`plan-setup-sql-sync: stdin is not valid JSON (${error.message})`, {
      cause: error,
    })
  }
  if (!Array.isArray(parsed?.jobs))
    throw new Error('plan-setup-sql-sync: stdin must be {"jobs":[{name,dir}]}')
  return parsed.jobs
}

const registry = getRawRegistry()
const plans = []

for (const job of readJobs()) {
  const name = job?.name
  const dir = job?.dir
  if (typeof name !== 'string' || typeof dir !== 'string') {
    plans.push({ name: String(name), error: 'job needs a string name and dir' })
    continue
  }
  const entry = registry.packages?.[name]
  if (!entry) {
    plans.push({ name, error: `${name} has no entry in the registry under test` })
    continue
  }
  try {
    const tables = (await scanForTables(dir)).map((table) => ({
      name: table.name,
      sqlFile: relative(dir, table.sqlFile),
    }))
    const bundle = await scanSetupSqlBundle(dir)
    const version = readPackageVersion(dir)
    const entryHasSetup =
      entry.setupSql !== undefined ||
      entry.setupSqlVersion !== undefined ||
      (entry.tables?.length ?? 0) > 0
    if (version === null && (entryHasSetup || bundle !== null || tables.length > 0)) {
      plans.push({
        name,
        error:
          `${name}: the committed package at ${dir} declares no exact version — ` +
          'its setup SQL cannot be tagged with the pin',
      })
      continue
    }
    plans.push({
      name,
      plan: planSetupSqlEntrySync({
        name,
        entry,
        sibling: { tables, bundle, version },
        pinned: getMoleculeVersion(name),
      }),
    })
  } catch (error) {
    plans.push({ name, error: `${name}: ${String(error?.message ?? error)}` })
  }
}

process.stdout.write(JSON.stringify({ plans }))
