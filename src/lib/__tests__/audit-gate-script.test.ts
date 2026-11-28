/**
 * The real audit CLI (scripts/audit-gate.mjs, a byte-identical copy of molecule's) must
 * distinguish a clean scan from an unavailable one and accept a finding only when every
 * advisory it carries is accepted. This copy passed an npm error document as a clean scan
 * until 2026-11-15, two weeks after molecule's was fixed.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Run the actual script with npm's response supplied through its executable boundary.
 *
 * @param report - The JSON npm prints.
 * @param exitCode - npm's exit code.
 * @param accepted - The allowlist entries.
 * @param args - Arguments for the script.
 * @param manifest - The repo's package.json, when it has one.
 * @param loglevel - The log level inherited by npm.
 * @returns The script's result and the arguments npm was called with.
 */
function audit(
  report: unknown,
  exitCode = 0,
  accepted: object[] = [],
  args: string[] = [],
  manifest?: object,
  loglevel = 'notice',
): SpawnSyncReturns<string> & { npmArgs: string[] } {
  const root = mkdtempSync(join(tmpdir(), 'molecule-audit-control-'))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'bin'))
    copyFileSync(
      new URL('../../../scripts/audit-gate.mjs', import.meta.url),
      join(root, 'scripts/audit-gate.mjs'),
    )
    writeFileSync(join(root, '.audit-allowlist.json'), JSON.stringify({ accepted }))
    if (manifest) writeFileSync(join(root, 'package.json'), JSON.stringify(manifest))
    const argsFile = join(root, 'npm-args.json')
    writeFileSync(
      join(root, 'bin/npm'),
      `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(args))
const report = ${JSON.stringify(JSON.stringify(report) ?? '')}
const level = args.find((arg) => arg.startsWith('--loglevel='))?.split('=')[1] ?? process.env.npm_config_loglevel
if (report) fs.writeSync(1, report)
else if (level !== 'silent') fs.writeSync(2, 'npm error code EUSAGE\\n')
process.exitCode = ${exitCode}
`,
      { mode: 0o755 },
    )
    const result = spawnSync(
      'bash',
      [
        '-c',
        '"$@" > >(cat) 2> >(cat >&2)',
        '--',
        process.execPath,
        join(root, 'scripts/audit-gate.mjs'),
        ...args,
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH}`,
          npm_config_loglevel: loglevel,
        },
        timeout: 10_000,
      },
    )
    let npmArgs: string[] = []
    try {
      npmArgs = JSON.parse(readFileSync(argsFile, 'utf8'))
    } catch (_error) {
      // npm was never called: the assertion on npmArgs reports it.
    }
    return Object.assign(result, { npmArgs })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const clean = { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } }
const vulnerable = {
  vulnerabilities: {
    example: {
      severity: 'high',
      via: [{ url: 'https://github.com/advisories/GHSA-example-control' }],
      fixAvailable: true,
    },
  },
  metadata: { vulnerabilities: { high: 1, total: 1 } },
}

describe('audit-gate CLI', () => {
  it('reports the same npm failure when no JSON is available under a silent parent', () => {
    const normal = audit(undefined, 1, [], [], undefined, 'notice')
    const silent = audit(undefined, 1, [], [], undefined, 'silent')
    expect(normal.status).toBe(2)
    expect(normal.stderr).toContain('produced no output')
    expect(normal.stderr).toContain('npm error code EUSAGE')
    expect(silent.status).toBe(normal.status)
    expect(silent.stderr).toBe(normal.stderr)
  })

  it('accepts a complete clean report without an installed dependency tree', () => {
    expect(audit(clean).status).toBe(0)
  })

  it.each([[], ['--list']])('refuses npm endpoint errors with args %j', (...args) => {
    const result = audit({ error: { code: 'ENOTFOUND' } }, 1, [], args as string[])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('complete vulnerability report')
    expect(result.stdout).not.toContain('no unaccepted')
  })

  it.each([{}, { vulnerabilities: {} }, { ...clean, vulnerabilities: [] }])(
    'refuses an incomplete report %j',
    (report) => {
      expect(audit(report).status).toBe(2)
    },
  )

  it('still fails a real unaccepted advisory', () => {
    expect(audit(vulnerable, 1).status).toBe(1)
  })

  it('preserves the narrow, dated exception and its expiry', () => {
    const exception = {
      advisories: ['GHSA-example-control'],
      reason: 'Consumer control',
      expires: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    }
    expect(audit(vulnerable, 1, [exception]).status).toBe(0)
    expect(audit(vulnerable, 1, [{ ...exception, expires: '2000-01-01' }]).status).toBe(1)
  })

  it('requires every advisory a package is vulnerable through to be accepted', () => {
    const expires = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const twoAdvisories = {
      vulnerabilities: {
        matcher: {
          severity: 'moderate',
          via: [{ url: 'https://github.com/advisories/GHSA-first-control' }],
          fixAvailable: false,
        },
        walker: {
          severity: 'moderate',
          via: ['matcher', { url: 'https://github.com/advisories/GHSA-second-control' }],
          fixAvailable: false,
        },
      },
      metadata: { vulnerabilities: { moderate: 2, total: 2 } },
    }
    const first = { advisories: ['GHSA-first-control'], reason: 'First control', expires }
    const second = { advisories: ['GHSA-second-control'], reason: 'Second control', expires }
    const onlyFirst = audit(twoAdvisories, 1, [first])
    expect(onlyFirst.status).toBe(1)
    expect(onlyFirst.stderr).toContain('advisory in walker')
    expect(onlyFirst.stderr).toContain('unaccepted: GHSA-second-control')
    expect(audit(twoAdvisories, 1, [first, second]).status).toBe(0)
    expect(audit(twoAdvisories, 1, [first, { ...second, expires: '2000-01-01' }]).status).toBe(1)
  })

  it('accepts the recorded picomatch advisory through the CLI dependency chain only while covered', () => {
    const { accepted } = JSON.parse(
      readFileSync(new URL('../../../.audit-allowlist.json', import.meta.url), 'utf8'),
    ) as { accepted: object[] }
    const { packages } = JSON.parse(
      readFileSync(new URL('../../../package-lock.json', import.meta.url), 'utf8'),
    ) as { packages: Record<string, { version?: string }> }
    // Recreate the audit for the affected releases in the lock when the advisory landed.
    // Once those versions leave the lockfile, this can pass without the exception.
    const affected = Object.entries(packages).some(
      ([path, entry]) =>
        /(^|\/)node_modules\/picomatch$/.test(path) &&
        ['2.3.2', '4.0.5', '4.0.7'].includes(entry.version ?? ''),
    )
    const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf'
    const dependency = { severity: 'high', via: ['tinyglobby'], fixAvailable: false }
    const chain = affected
      ? {
          picomatch: { severity: 'high', via: [{ url: advisory }], fixAvailable: false },
          tinyglobby: { ...dependency, via: ['picomatch'] },
          '@oclif/core': dependency,
        }
      : {}
    expect(audit({ ...clean, vulnerabilities: chain }, affected ? 1 : 0, accepted).status).toBe(0)
    const newFinding = {
      ...dependency,
      via: [...dependency.via, { url: 'https://github.com/advisories/GHSA-unrelated-control' }],
    }
    const result = audit(
      { ...clean, vulnerabilities: { ...chain, '@oclif/core': newFinding } },
      1,
      accepted,
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('unaccepted: GHSA-unrelated-control')
  })

  it('needs no entry for a low advisory riding along an accepted chain', () => {
    const expires = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const report = {
      vulnerabilities: {
        merger: {
          severity: 'low',
          via: [{ url: 'https://github.com/advisories/GHSA-low-control', severity: 'low' }],
          fixAvailable: false,
        },
        builder: {
          severity: 'moderate',
          via: [
            'merger',
            { url: 'https://github.com/advisories/GHSA-moderate-control', severity: 'moderate' },
          ],
          fixAvailable: false,
        },
      },
      metadata: { vulnerabilities: { low: 1, moderate: 1, total: 2 } },
    }
    const moderate = { advisories: ['GHSA-moderate-control'], reason: 'Moderate control', expires }
    expect(audit(report, 1).status).toBe(1)
    expect(audit(report, 1, [moderate]).status).toBe(0)
  })

  it('audits its own lockfile when the repo is not a workspaces root (mlcl inside the workspace)', () => {
    expect(audit(clean, 0, [], [], { name: 'mlcl' }).npmArgs).toEqual([
      'audit',
      '--json',
      '--loglevel=notice',
      '--workspaces=false',
    ])
  })

  it('keeps the members of a workspaces root in the audit (molecule)', () => {
    expect(audit(clean, 0, [], [], { workspaces: ['packages/*'] }).npmArgs).toEqual([
      'audit',
      '--json',
      '--loglevel=notice',
    ])
  })

  it('fails a finding whose advisory cannot be identified', () => {
    const unidentified = {
      vulnerabilities: {
        orphan: { severity: 'high', via: ['missing-dependency'], fixAvailable: false },
      },
      metadata: { vulnerabilities: { high: 1, total: 1 } },
    }
    expect(audit(unidentified, 1).status).toBe(1)
  })
})
